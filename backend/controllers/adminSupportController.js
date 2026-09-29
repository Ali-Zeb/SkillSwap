const mongoose         = require('mongoose');
const SupportTicket    = require('../models/SupportTicket');
const asyncHandler     = require('../utils/asyncHandler');
const supportService   = require('../services/supportService');
const adminUserService = require('../services/adminUserService');
const {
    SUPPORT_STATUS, SUPPORT_CATEGORIES, SUPPORT_PRIORITY, AUDIT_ACTIONS
} = require('../config/constants');

const getIo = (req) => req.app.get('io') || null;
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getPagination = (query) => {
    const page  = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 50);
    return { page, limit, skip: (page - 1) * limit };
};

const loadTicket = async (req, res) => {
    if (!isValidId(req.params.id)) {
        res.status(400).json({ success: false, message: 'Invalid id format' });
        return null;
    }
    const ticket = await SupportTicket.findById(req.params.id);
    if (!ticket) {
        res.status(404).json({ success: false, message: 'Support ticket not found' });
        return null;
    }
    return ticket;
};

const populateTicket = (ticket) => ticket.populate([
    { path: 'user',       select: 'fullName email avatar isActive' },
    { path: 'assignedTo', select: 'fullName avatar' },
    { path: 'messages.senderId', select: 'fullName' }
]);

// ---------------------------------------------------------------------------
// @desc    List tickets: filter by status/category/priority, search, paginate
// @route   GET /api/admin/support?status=&category=&priority=&search=&page=
// @access  Admin
// ---------------------------------------------------------------------------
const listTickets = asyncHandler(async (req, res) => {
    const { status, category, priority, search = '' } = req.query;
    const filter = {};
    const bad = (name, allowed) => res.status(400).json({ success: false, message: `${name} must be one of: ${allowed.join(', ')}` });

    if (status) {
        if (status === 'active') filter.status = { $in: [SUPPORT_STATUS.OPEN, SUPPORT_STATUS.IN_PROGRESS] };
        else if (Object.values(SUPPORT_STATUS).includes(status)) filter.status = status;
        else return bad('status', ['active', ...Object.values(SUPPORT_STATUS)]);
    }
    if (category) {
        if (!SUPPORT_CATEGORIES.includes(category)) return bad('category', SUPPORT_CATEGORIES);
        filter.category = category;
    }
    if (priority) {
        if (!SUPPORT_PRIORITY.includes(priority)) return bad('priority', SUPPORT_PRIORITY);
        filter.priority = priority;
    }
    const term = String(search).trim().slice(0, 100);
    if (term) {
        const rx = new RegExp(escapeRegex(term), 'i');
        filter.$or = [{ subject: rx }, { name: rx }, { email: rx }];
    }

    const pg = getPagination(req.query);
    const [items, total] = await Promise.all([
        SupportTicket.find(filter)
            // Only the latest message, for a preview line in the inbox.
            .select({
                name: 1, email: 1, category: 1, subject: 1, status: 1, priority: 1, awaitingAdmin: 1,
                assignedTo: 1, source: 1, createdAt: 1, updatedAt: 1, messages: { $slice: -1 }
            })
            .populate('assignedTo', 'fullName')
            .sort({ awaitingAdmin: -1, updatedAt: -1 })
            .skip(pg.skip)
            .limit(pg.limit)
            .lean()
            .then((list) => list.map(({ messages, ...t }) => {
                const last = messages?.[0];
                return {
                    ...t,
                    lastMessage: last
                        ? { sender: last.sender, body: last.body.length > 160 ? last.body.slice(0, 159) + '…' : last.body, createdAt: last.createdAt }
                        : null
                };
            })),
        SupportTicket.countDocuments(filter)
    ]);

    res.status(200).json({
        success: true,
        items,
        pagination: { page: pg.page, limit: pg.limit, total, pages: Math.max(Math.ceil(total / pg.limit), 1) }
    });
});

// ---------------------------------------------------------------------------
// @desc    Tickets waiting for an admin (sidebar badge)
// @route   GET /api/admin/support/count
// @access  Admin
// ---------------------------------------------------------------------------
const awaitingCount = asyncHandler(async (req, res) => {
    res.status(200).json({ success: true, count: await supportService.countAwaitingAdmin() });
});

// ---------------------------------------------------------------------------
// @desc    One ticket with its full thread
// @route   GET /api/admin/support/:id
// @access  Admin
// ---------------------------------------------------------------------------
const getTicket = asyncHandler(async (req, res) => {
    const ticket = await loadTicket(req, res);
    if (!ticket) return;
    await populateTicket(ticket);
    res.status(200).json({ success: true, ticket });
});

// ---------------------------------------------------------------------------
// @desc    Reply as the support team
// @route   POST /api/admin/support/:id/messages   { body }
// @access  Admin
// ---------------------------------------------------------------------------
const replyToTicket = asyncHandler(async (req, res) => {
    const ticket = await loadTicket(req, res);
    if (!ticket) return;

    if (ticket.status === SUPPORT_STATUS.CLOSED) {
        return res.status(400).json({ success: false, message: 'Reopen the ticket before replying.' });
    }

    const body = req.body.body.trim();
    ticket.messages.push({ sender: 'admin', senderId: req.user._id, body });
    ticket.awaitingAdmin = false;
    if (!ticket.firstResponseAt) ticket.firstResponseAt = new Date();
    if (ticket.status === SUPPORT_STATUS.OPEN) ticket.status = SUPPORT_STATUS.IN_PROGRESS;
    if (!ticket.assignedTo) ticket.assignedTo = req.user._id;
    await ticket.save();

    await adminUserService.audit(req.user.id, AUDIT_ACTIONS.SUPPORT_REPLIED, 'support_ticket', ticket._id, {
        subject: ticket.subject, email: ticket.email
    });
    supportService.onAdminUpdate(ticket, { excerpt: body }, getIo(req));

    await populateTicket(ticket);
    res.status(201).json({ success: true, message: 'Reply sent.', ticket });
});

// ---------------------------------------------------------------------------
// @desc    Change status / priority / assignee
// @route   PATCH /api/admin/support/:id   { status?, priority?, assignedTo? }
// @access  Admin
// ---------------------------------------------------------------------------
const updateTicket = asyncHandler(async (req, res) => {
    const ticket = await loadTicket(req, res);
    if (!ticket) return;

    const { status, priority } = req.body;
    const changes = {};

    if (req.body.assignedTo !== undefined) {
        const assignee = req.body.assignedTo || null;
        if (assignee && (!isValidId(assignee) || !(await supportService.isActiveAdmin(assignee)))) {
            return res.status(400).json({ success: false, message: 'Tickets can only be assigned to an active admin' });
        }
        if (String(ticket.assignedTo || '') !== String(assignee || '')) {
            changes.assignedTo = { from: ticket.assignedTo, to: assignee };
            ticket.assignedTo = assignee;
        }
    }
    if (priority && priority !== ticket.priority) {
        changes.priority = { from: ticket.priority, to: priority };
        ticket.priority = priority;
    }
    const becameResolved = status === SUPPORT_STATUS.RESOLVED && ticket.status !== SUPPORT_STATUS.RESOLVED;
    if (status && status !== ticket.status) {
        changes.status = { from: ticket.status, to: status };
        ticket.status = status;
        // Resolved/closed tickets no longer wait for an admin.
        if ([SUPPORT_STATUS.RESOLVED, SUPPORT_STATUS.CLOSED].includes(status)) ticket.awaitingAdmin = false;
    }

    if (Object.keys(changes).length === 0) {
        return res.status(400).json({ success: false, message: 'Nothing to change' });
    }

    await ticket.save();
    await adminUserService.audit(req.user.id, AUDIT_ACTIONS.SUPPORT_UPDATED, 'support_ticket', ticket._id, {
        subject: ticket.subject, ...changes
    });
    if (becameResolved) supportService.onAdminUpdate(ticket, { resolved: true }, getIo(req));

    await populateTicket(ticket);
    res.status(200).json({ success: true, message: 'Ticket updated.', ticket });
});

module.exports = { listTickets, awaitingCount, getTicket, replyToTicket, updateTicket };
