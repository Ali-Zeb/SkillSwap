const express = require('express');
const router  = express.Router();

const { protect, authorize } = require('../middleware/auth');
const { validateBody }       = require('../middleware/validate');
const { LIMITS, USER_ROLES, REPORT_STATUS, SUPPORT_STATUS, SUPPORT_PRIORITY } = require('../config/constants');
const {
    listTickets, awaitingCount, getTicket, replyToTicket, updateTicket
} = require('../controllers/adminSupportController');
const {
    getPlatformReport, exportPlatformReport, getUserReport, exportUserReport, exportUsers
} = require('../controllers/analyticsController');

const {
    getStats,
    getUsers,
    updateUserStatus,
    updateUserRole,
    getSessions,
    getReports,
    updateReport,
    getAuditLogs
} = require('../controllers/adminController');

// Every admin route: valid JWT + active account (protect re-reads the user
// from the DB on each request) + role 'admin' from that fresh DB record.
router.use(protect, authorize('admin'));

router.get('/stats', getStats);

router.get('/users', getUsers);
router.get('/users/export', exportUsers);   // before /users/:id routes

// Analytics
router.get('/analytics/platform',          getPlatformReport);
router.get('/analytics/platform/export',   exportPlatformReport);
router.get('/analytics/users/:id',         getUserReport);
router.get('/analytics/users/:id/export',  exportUserReport);
router.patch(
    '/users/:id/status',
    validateBody({
        isActive: { required: true, type: 'boolean' },
        reason:   { type: 'string', max: 500 }
    }),
    updateUserStatus
);
router.patch(
    '/users/:id/role',
    validateBody({
        role: { required: true, type: 'string', enum: USER_ROLES }
    }),
    updateUserRole
);

router.get('/sessions', getSessions);

router.get('/reports', getReports);
router.patch(
    '/reports/:id',
    validateBody({
        status:         { required: true, type: 'string', enum: Object.values(REPORT_STATUS) },
        resolutionNote: { type: 'string', max: LIMITS.RESOLUTION_NOTE_MAX },
        deactivateUser: { type: 'boolean' }
    }),
    updateReport
);

router.get('/audit-logs', getAuditLogs);

// Support tickets
router.get('/support',       listTickets);
router.get('/support/count', awaitingCount);
router.get('/support/:id',   getTicket);
router.post(
    '/support/:id/messages',
    validateBody({ body: { required: true, type: 'string', min: 1, max: LIMITS.SUPPORT_MESSAGE_MAX, transform: (v) => (typeof v === 'string' ? v.trim() : v) } }),
    replyToTicket
);
router.patch(
    '/support/:id',
    validateBody({
        status:     { type: 'string', enum: Object.values(SUPPORT_STATUS) },
        priority:   { type: 'string', enum: SUPPORT_PRIORITY },
        assignedTo: { type: 'string' }
    }),
    updateTicket
);

module.exports = router;
