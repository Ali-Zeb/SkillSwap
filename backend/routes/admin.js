const express = require('express');
const router  = express.Router();

const { protect, authorize } = require('../middleware/auth');
const { validateBody }       = require('../middleware/validate');
const { LIMITS, USER_ROLES, REPORT_STATUS } = require('../config/constants');

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

module.exports = router;
