const mongoose       = require('mongoose');
const SupportTicket  = require('../models/SupportTicket');
const asyncHandler   = require('../utils/asyncHandler');
const supportService = require('../services/supportService');
const {
    SUPPORT_STATUS, SUPPORT_CATEGORY_LABELS, isDisposableEmail
} = require('../config/constants');

const getIo = (req) => req.app.get('io') || null;
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);

// ---------------------------------------------------------------------------
// @desc    Open a support ticket (signed-in member)
// @route   POST /api/support   { category, subject, message }
// @access  Member
// ---------------------------------------------------------------------------
const createTicket = asyncHandler(async (req, res) => {
    const { category, subject, message } = req.body;

    const ticket = await SupportTicket.create({
        user:     req.user._id,
        name:     req.user.fullName,
        email:    req.user.email,
        category,
        subject:  subject.trim(),
        messages: [{ sender: 'user', senderId: req.user._id, body: message.trim() }],
        source:   'app'
    });

    supportService.onTicketCreated(ticket, getIo(req));
    res.status(201).json({ success: true, message: 'Your request was sent to the support team.', ticket });
});

// ---------------------------------------------------------------------------
// @desc    Public contact form (no login) — for locked-out or deactivated users
// @route   POST /api/support/public   { name, email, category, message }
// @access  Public (rate-limited)
// ---------------------------------------------------------------------------
const createPublicTicket = asyncHandler(async (req, res) => {
    const { name, category, message } = req.body;
    const email = req.body.email.toLowerCase().trim();

    if (isDisposableEmail(email)) {
        return res.status(400).json({ success: false, message: 'Please use your real email address so we can reply.' });
    }

    // The account (if any) is not linked here: anyone can type any email, so
    // replies go by email only and the thread stays admin-side.
    const ticket = await SupportTicket.create({
        name:     name.trim(),
        email,
        category,
        subject:  `${SUPPORT_CATEGORY_LABELS[category]} request`,
        messages: [{ sender: 'user', body: message.trim() }],
        source:   'public'
    });

    supportService.onTicketCreated(ticket, getIo(req));
    res.status(201).json({ success: true, message: 'Thanks — we received your message and will reply by email.' });
});

// ---------------------------------------------------------------------------
// @desc    My tickets (newest first)
// @route   GET /api/support/mine
// @access  Member
// ---------------------------------------------------------------------------
const getMyTickets = asyncHandler(async (req, res) => {
    const tickets = await SupportTicket.find({ user: req.user._id })
        .select('category subject status createdAt updatedAt awaitingAdmin messages')
        .sort({ updatedAt: -1 })
        .limit(100)
        .lean();

    res.status(200).json({
        success: true,
        count:   tickets.length,
        tickets: tickets.map(({ messages, ...t }) => ({
            ...t,
            messageCount: messages.length,
            lastMessageFrom: messages[messages.length - 1]?.sender || 'user'
        }))
    });
});

// Loads a ticket owned by the signed-in member (404 for anyone else's).
const findOwnTicket = async (req, res) => {
    if (!isValidId(req.params.id)) {
        res.status(400).json({ success: false, message: 'Invalid id format' });
        return null;
    }
    const ticket = await SupportTicket.findOne({ _id: req.params.id, user: req.user._id });
    if (!ticket) {
        res.status(404).json({ success: false, message: 'Support request not found' });
        return null;
    }
    return ticket;
};

// Admin identities are not shown to members — replies read "Support team".
const toMemberView = (ticket) => {
    const t = ticket.toObject();
    delete t.assignedTo;
    delete t.priority;
    t.messages = t.messages.map(({ senderId, ...m }) => m);
    return t;
};

// ---------------------------------------------------------------------------
// @desc    One of my tickets with its thread
// @route   GET /api/support/:id
// @access  Member
// ---------------------------------------------------------------------------
const getMyTicket = asyncHandler(async (req, res) => {
    const ticket = await findOwnTicket(req, res);
    if (!ticket) return;
    res.status(200).json({ success: true, ticket: toMemberView(ticket) });
});

// ---------------------------------------------------------------------------
// @desc    Reply to my ticket (not allowed once closed; reopens a resolved one)
// @route   POST /api/support/:id/messages   { body }
// @access  Member
// ---------------------------------------------------------------------------
const replyToMyTicket = asyncHandler(async (req, res) => {
    const ticket = await findOwnTicket(req, res);
    if (!ticket) return;

    if (ticket.status === SUPPORT_STATUS.CLOSED) {
        return res.status(400).json({ success: false, message: 'This request is closed. Please open a new one.' });
    }

    ticket.messages.push({ sender: 'user', senderId: req.user._id, body: req.body.body.trim() });
    ticket.awaitingAdmin = true;
    if (ticket.status === SUPPORT_STATUS.RESOLVED) ticket.status = SUPPORT_STATUS.OPEN;
    await ticket.save();

    res.status(201).json({ success: true, message: 'Reply sent.', ticket: toMemberView(ticket) });
});

module.exports = { createTicket, createPublicTicket, getMyTickets, getMyTicket, replyToMyTicket };
