const User              = require('../models/User');
const asyncHandler      = require('../utils/asyncHandler');
const analyticsService  = require('../services/analyticsService');
const adminUserService  = require('../services/adminUserService');
const { toCsv, toCsvSections, sendCsv } = require('../utils/csv');
const { AUDIT_ACTIONS, USER_ROLES } = require('../config/constants');

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const day = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
const stamp = () => new Date().toISOString().slice(0, 10);

const logExport = (req, what, targetType = 'export', targetId = null, extra = {}) =>
    adminUserService.audit(req.user.id, AUDIT_ACTIONS.DATA_EXPORTED, targetType, targetId, { export: what, ...extra });

// ---------------------------------------------------------------------------
// @desc    Platform report for a date range
// @route   GET /api/admin/analytics/platform?range=7d|30d|90d|custom&from=&to=
// @access  Admin
// ---------------------------------------------------------------------------
const getPlatformReport = asyncHandler(async (req, res) => {
    const report = await analyticsService.getPlatformReport(req.query);
    res.status(200).json({ success: true, report });
});

// ---------------------------------------------------------------------------
// @desc    Platform report as CSV (audit-logged)
// @route   GET /api/admin/analytics/platform/export?range=...
// @access  Admin
// ---------------------------------------------------------------------------
const exportPlatformReport = asyncHandler(async (req, res) => {
    const r = await analyticsService.getPlatformReport(req.query);
    const kv = [{ header: 'Metric', value: (x) => x[0] }, { header: 'Value', value: (x) => x[1] }];
    const csv = toCsvSections([
        { title: `SkillSwap platform report ${r.range.from} to ${r.range.to} (generated ${r.generatedAt})`, columns: kv, rows: [
            ['New members', r.users.new],
            ['Sessions created', r.sessions.created],
            ['Sessions completed (scheduled in range)', r.sessions.completed],
            ['Sessions cancelled (scheduled in range)', r.sessions.cancelled],
            ['Completion rate %', r.sessions.completionRate ?? ''],
            ['Ratings received', r.ratings.count],
            ['Average rating', r.ratings.average],
            ['Complaints received', r.complaints.received],
            ['Complaints resolved', r.complaints.resolved],
            ['Support tickets open (now)', r.support.open],
            ['Support tickets created', r.support.created],
            ['Support tickets resolved', r.support.resolved],
            ['Avg first response (hours)', r.support.avgFirstResponseHours ?? '']
        ] },
        { title: 'Top skills taught (current profiles)', columns: [{ header: 'Skill', value: (x) => x.name }, { header: 'Category', value: (x) => x.category }, { header: 'Members', value: (x) => x.members }], rows: r.topSkills.taught },
        { title: 'Top skills requested (current profiles)', columns: [{ header: 'Skill', value: (x) => x.name }, { header: 'Category', value: (x) => x.category }, { header: 'Members', value: (x) => x.members }], rows: r.topSkills.requested },
        { title: 'Top teachers (completed sessions in range)', columns: [{ header: 'Name', value: (x) => x.fullName }, { header: 'Completed', value: (x) => x.completed }, { header: 'Average rating', value: (x) => x.averageRating }, { header: 'Ratings', value: (x) => x.ratingsCount }], rows: r.topTeachers },
        { title: 'Daily trends', columns: [
            { header: 'Date', value: (x) => x.date },
            { header: 'New members', value: (x) => x.users },
            { header: 'Sessions created', value: (x) => x.sessions },
            { header: 'Complaints', value: (x) => x.complaints }
        ], rows: r.trends.newUsers.map((u, i) => ({ date: u.date, users: u.value, sessions: r.trends.sessionsCreated[i].value, complaints: r.trends.complaints[i].value })) }
    ]);

    await logExport(req, 'platform_report', 'export', null, { range: r.range });
    sendCsv(res, `skillswap-platform-report-${r.range.from}-to-${r.range.to}.csv`, csv);
});

// ---------------------------------------------------------------------------
// @desc    Per-member report
// @route   GET /api/admin/analytics/users/:id
// @access  Admin
// ---------------------------------------------------------------------------
const getUserReport = asyncHandler(async (req, res) => {
    const report = await analyticsService.getUserReport(req.params.id);
    res.status(200).json({ success: true, report });
});

// ---------------------------------------------------------------------------
// @desc    Per-member report as CSV (audit-logged)
// @route   GET /api/admin/analytics/users/:id/export
// @access  Admin
// ---------------------------------------------------------------------------
const exportUserReport = asyncHandler(async (req, res) => {
    const r = await analyticsService.getUserReport(req.params.id);
    const kv = [{ header: 'Field', value: (x) => x[0] }, { header: 'Value', value: (x) => x[1] }];
    const csv = toCsvSections([
        { title: `SkillSwap member report — ${r.user.fullName} (generated ${r.generatedAt})`, columns: kv, rows: [
            ['Name', r.user.fullName], ['Email', r.user.email], ['Status', r.user.isActive ? 'Active' : 'Deactivated'],
            ['Deactivation reason', r.user.deactivationReason || ''], ['Joined', day(r.user.joinedAt)], ['Last active', day(r.user.lastActive)],
            ['Reputation', r.user.reputation], ['Teaches', r.user.teaches.join('; ')], ['Wants to learn', r.user.learns.join('; ')],
            ['Sessions taught', r.sessions.taught], ['Sessions learned', r.sessions.learned], ['Completed', r.sessions.completed],
            ['Cancelled', r.sessions.cancelled], ['Upcoming / pending', r.sessions.upcomingOrPending],
            ['Ratings received', r.ratings.count], ['Average rating', r.ratings.average],
            ['Reports against', r.reports.total]
        ] },
        { title: 'Badges', columns: [{ header: 'Badge', value: (x) => x.label }, { header: 'Earned', value: (x) => day(x.earnedAt) }], rows: r.badges },
        { title: 'Reports filed against this member', columns: [
            { header: 'Date', value: (x) => day(x.createdAt) }, { header: 'Reason', value: (x) => x.reason },
            { header: 'About', value: (x) => x.targetType }, { header: 'Status', value: (x) => x.status },
            { header: 'Resolution note', value: (x) => x.resolutionNote }
        ], rows: r.reports.items }
    ]);

    await logExport(req, 'member_report', 'user', r.user._id, { userName: r.user.fullName });
    const safeName = r.user.fullName.normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'member';
    sendCsv(res, `skillswap-member-${safeName}-${stamp()}.csv`, csv);
});

// ---------------------------------------------------------------------------
// @desc    User list as CSV — same filters as GET /api/admin/users (audit-logged)
// @route   GET /api/admin/users/export?search=&role=&status=
// @access  Admin
// ---------------------------------------------------------------------------
const exportUsers = asyncHandler(async (req, res) => {
    const { search = '', role, status } = req.query;
    const filter = {};
    if (role) {
        if (!USER_ROLES.includes(role)) return res.status(400).json({ success: false, message: `role must be one of: ${USER_ROLES.join(', ')}` });
        filter.role = role;
    }
    if (status) {
        if (!['active', 'inactive'].includes(status)) return res.status(400).json({ success: false, message: 'status must be one of: active, inactive' });
        filter.isActive = status === 'active';
    }
    const term = String(search).trim().slice(0, 100);
    if (term) {
        const rx = new RegExp(escapeRegex(term), 'i');
        filter.$or = [{ fullName: rx }, { email: rx }];
    }

    const users = await User.find(filter)
        .select('fullName email role isActive deactivationReason reputation createdAt lastActive badges')
        .sort({ createdAt: -1 })
        .limit(10000)
        .lean();

    const csv = toCsv([
        { header: 'Name', value: (u) => u.fullName },
        { header: 'Email', value: (u) => u.email },
        { header: 'Role', value: (u) => u.role },
        { header: 'Status', value: (u) => (u.isActive ? 'Active' : 'Deactivated') },
        { header: 'Deactivation reason', value: (u) => u.deactivationReason || '' },
        { header: 'Reputation', value: (u) => u.reputation ?? 0 },
        { header: 'Badges', value: (u) => (u.badges || []).length },
        { header: 'Joined', value: (u) => day(u.createdAt) },
        { header: 'Last active', value: (u) => day(u.lastActive) }
    ], users);

    await logExport(req, 'user_list', 'export', null, { filters: { search: term, role: role || '', status: status || '' }, rows: users.length });
    sendCsv(res, `skillswap-users-${stamp()}.csv`, csv);
});

module.exports = { getPlatformReport, exportPlatformReport, getUserReport, exportUserReport, exportUsers };
