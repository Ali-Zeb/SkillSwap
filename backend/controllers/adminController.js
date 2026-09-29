const mongoose         = require('mongoose');
const User             = require('../models/User');
const Session          = require('../models/Session');
const Report           = require('../models/Report');
const Rating           = require('../models/Rating');
const AuditLog         = require('../models/AuditLog');
const asyncHandler     = require('../utils/asyncHandler');
const adminUserService = require('../services/adminUserService');
const { SESSION_STATUS, REPORT_STATUS, USER_ROLES, AUDIT_ACTIONS } = require('../config/constants');

const getIo = (req) => req.app.get('io') || null;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Parses ?page & ?limit into safe integers (page ≥ 1, 1 ≤ limit ≤ 50).
 */
const getPagination = (query) => {
    const page  = Math.max(parseInt(query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 50);
    return { page, limit, skip: (page - 1) * limit };
};

const paginated = (items, total, { page, limit }) => ({
    items,
    pagination: { page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) }
});

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const badFilter = (res, name, allowed) =>
    res.status(400).json({ success: false, message: `${name} must be one of: ${allowed.join(', ')}` });

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);

// Turns [{ _id: 'x', count: 3 }] into { x: 3 }, with every known key present.
const countsByKey = (rows, keys) => {
    const out = Object.fromEntries(keys.map((k) => [k, 0]));
    rows.forEach((r) => { if (r._id != null) out[r._id] = r.count; });
    return out;
};

// ---------------------------------------------------------------------------
// @desc    Platform statistics for the admin dashboard
// @route   GET /api/admin/stats
// @access  Admin
// ---------------------------------------------------------------------------
const getStats = asyncHandler(async (req, res) => {
    const now = Date.now();
    const [
        totalUsers, activeUsers, admins, newUsers7d, newUsers30d,
        sessionRows, reportRows, ratingRows
    ] = await Promise.all([
        User.countDocuments({}),
        User.countDocuments({ isActive: true }),
        User.countDocuments({ role: 'admin' }),
        User.countDocuments({ createdAt: { $gte: new Date(now - 7 * DAY_MS) } }),
        User.countDocuments({ createdAt: { $gte: new Date(now - 30 * DAY_MS) } }),
        Session.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Report.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
        Rating.aggregate([{ $group: { _id: null, count: { $sum: 1 }, average: { $avg: '$rating' } } }])
    ]);

    const sessionsByStatus = countsByKey(sessionRows, Object.values(SESSION_STATUS));
    const reportsByStatus  = countsByKey(reportRows, Object.values(REPORT_STATUS));
    const ratings          = ratingRows[0] || { count: 0, average: 0 };

    res.status(200).json({
        success: true,
        stats: {
            users: {
                total:    totalUsers,
                active:   activeUsers,
                inactive: totalUsers - activeUsers,
                admins,
                new7d:    newUsers7d,
                new30d:   newUsers30d
            },
            sessions: {
                total:    Object.values(sessionsByStatus).reduce((a, b) => a + b, 0),
                byStatus: sessionsByStatus
            },
            reports: {
                total:    Object.values(reportsByStatus).reduce((a, b) => a + b, 0),
                byStatus: reportsByStatus
            },
            ratings: {
                total:   ratings.count,
                average: Math.round((ratings.average || 0) * 10) / 10
            }
        }
    });
});

// ---------------------------------------------------------------------------
// @desc    List users (search name/email, filter role/status, paginated)
// @route   GET /api/admin/users?search=&role=&status=active|inactive&page=&limit=
// @access  Admin
// ---------------------------------------------------------------------------
const getUsers = asyncHandler(async (req, res) => {
    const { search = '', role, status } = req.query;
    const filter = {};

    if (role) {
        if (!USER_ROLES.includes(role)) return badFilter(res, 'role', USER_ROLES);
        filter.role = role;
    }
    if (status) {
        if (!['active', 'inactive'].includes(status)) return badFilter(res, 'status', ['active', 'inactive']);
        filter.isActive = status === 'active';
    }
    const term = String(search).trim().slice(0, 100);
    if (term) {
        const rx = new RegExp(escapeRegex(term), 'i');
        filter.$or = [{ fullName: rx }, { email: rx }];
    }

    const pg = getPagination(req.query);
    const [users, total] = await Promise.all([
        User.find(filter)
            .select('fullName email avatar role isActive deactivationReason deactivatedAt reputation createdAt lastActive')
            .sort({ createdAt: -1 })
            .skip(pg.skip)
            .limit(pg.limit),
        User.countDocuments(filter)
    ]);

    res.status(200).json({ success: true, ...paginated(users, total, pg) });
});

// ---------------------------------------------------------------------------
// @desc    Activate or deactivate a user account
// @route   PATCH /api/admin/users/:id/status   { isActive, reason }
// @access  Admin
// ---------------------------------------------------------------------------
const updateUserStatus = asyncHandler(async (req, res) => {
    const { isActive, reason = '' } = req.body;

    if (!isActive && !reason.trim()) {
        return res.status(400).json({ success: false, message: 'A reason is required when deactivating an account' });
    }

    const user = await adminUserService.setUserActive({
        actorId:      req.user.id,
        targetUserId: req.params.id,
        isActive,
        reason:       reason.trim(),
        io:           getIo(req)
    });

    res.status(200).json({
        success: true,
        message: isActive ? 'Account reactivated' : 'Account deactivated',
        user: {
            _id: user._id, isActive: user.isActive,
            deactivationReason: user.deactivationReason, deactivatedAt: user.deactivatedAt
        }
    });
});

// ---------------------------------------------------------------------------
// @desc    Change a user's role
// @route   PATCH /api/admin/users/:id/role   { role }
// @access  Admin
// ---------------------------------------------------------------------------
const updateUserRole = asyncHandler(async (req, res) => {
    const user = await adminUserService.setUserRole({
        actorId:      req.user.id,
        targetUserId: req.params.id,
        role:         req.body.role
    });

    res.status(200).json({
        success: true,
        message: `Role changed to ${user.role}`,
        user: { _id: user._id, role: user.role }
    });
});

// ---------------------------------------------------------------------------
// @desc    List sessions (filter by status, paginated)
// @route   GET /api/admin/sessions?status=&page=&limit=
// @access  Admin
// ---------------------------------------------------------------------------
const getSessions = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const filter = {};
    const statuses = Object.values(SESSION_STATUS);
    if (status) {
        if (!statuses.includes(status)) return badFilter(res, 'status', statuses);
        filter.status = status;
    }

    const pg = getPagination(req.query);
    const [sessions, total] = await Promise.all([
        Session.find(filter)
            .select('title status date duration sessionType teacherId learnerId skillId createdAt')
            .populate('teacherId', 'fullName avatar')
            .populate('learnerId', 'fullName avatar')
            .populate('skillId', 'name')
            .sort({ date: -1 })
            .skip(pg.skip)
            .limit(pg.limit),
        Session.countDocuments(filter)
    ]);

    res.status(200).json({ success: true, ...paginated(sessions, total, pg) });
});

// ---------------------------------------------------------------------------
// @desc    List reports (filter by status, paginated, users populated)
// @route   GET /api/admin/reports?status=&page=&limit=
// @access  Admin
// ---------------------------------------------------------------------------
const getReports = asyncHandler(async (req, res) => {
    const { status } = req.query;
    const filter = {};
    const statuses = Object.values(REPORT_STATUS);
    if (status) {
        if (!statuses.includes(status)) return badFilter(res, 'status', statuses);
        filter.status = status;
    }

    const pg = getPagination(req.query);
    const [reports, total] = await Promise.all([
        Report.find(filter)
            .populate('reporter', 'fullName email avatar')
            .populate('reportedUser', 'fullName email avatar isActive role')
            .populate('reviewedBy', 'fullName')
            .sort({ createdAt: -1 })
            .skip(pg.skip)
            .limit(pg.limit),
        Report.countDocuments(filter)
    ]);

    res.status(200).json({ success: true, ...paginated(reports, total, pg) });
});

// ---------------------------------------------------------------------------
// @desc    Update a report's status/note; optionally deactivate the reported user
// @route   PATCH /api/admin/reports/:id   { status, resolutionNote, deactivateUser }
// @access  Admin
// ---------------------------------------------------------------------------
const updateReport = asyncHandler(async (req, res) => {
    const { status, deactivateUser = false } = req.body;
    const resolutionNote = (req.body.resolutionNote ?? '').trim();

    if (!isValidId(req.params.id)) {
        return res.status(400).json({ success: false, message: 'Invalid id format' });
    }

    const report = await Report.findById(req.params.id);
    if (!report) {
        return res.status(404).json({ success: false, message: 'Report not found' });
    }

    if (deactivateUser && status !== REPORT_STATUS.RESOLVED) {
        return res.status(400).json({ success: false, message: 'Deactivating the user is only allowed when resolving the report' });
    }

    // Deactivate first: if a guard blocks it (self, last admin), the report stays untouched.
    let userDeactivated = false;
    if (deactivateUser) {
        const target = await User.findById(report.reportedUser).select('isActive');
        if (target && target.isActive) {
            await adminUserService.setUserActive({
                actorId:      req.user.id,
                targetUserId: report.reportedUser,
                isActive:     false,
                reason:       resolutionNote || `Resolved report (${report.reason})`,
                io:           getIo(req)
            });
            userDeactivated = true;
        }
    }

    const previousStatus  = report.status;
    report.status         = status;
    report.resolutionNote = resolutionNote;
    report.reviewedBy     = req.user.id;
    await report.save();

    await adminUserService.audit(req.user.id, AUDIT_ACTIONS.REPORT_UPDATED, 'report', report._id, {
        from: previousStatus, to: status, resolutionNote, userDeactivated
    });

    await report.populate([
        { path: 'reporter',     select: 'fullName email avatar' },
        { path: 'reportedUser', select: 'fullName email avatar isActive role' },
        { path: 'reviewedBy',   select: 'fullName' }
    ]);

    res.status(200).json({
        success: true,
        message: userDeactivated ? 'Report updated and user deactivated' : 'Report updated',
        report
    });
});

// ---------------------------------------------------------------------------
// @desc    Audit log of admin actions (newest first, paginated)
// @route   GET /api/admin/audit-logs?page=&limit=
// @access  Admin
// ---------------------------------------------------------------------------
const getAuditLogs = asyncHandler(async (req, res) => {
    const pg = getPagination(req.query);
    const [logs, total] = await Promise.all([
        AuditLog.find({})
            .populate('actor', 'fullName avatar')
            .sort({ createdAt: -1 })
            .skip(pg.skip)
            .limit(pg.limit),
        AuditLog.countDocuments({})
    ]);

    res.status(200).json({ success: true, ...paginated(logs, total, pg) });
});

module.exports = {
    getStats,
    getUsers,
    updateUserStatus,
    updateUserRole,
    getSessions,
    getReports,
    updateReport,
    getAuditLogs
};
