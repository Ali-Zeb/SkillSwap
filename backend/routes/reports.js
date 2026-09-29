const express = require('express');
const router  = express.Router();

const { protect }       = require('../middleware/auth');
const { validateBody }  = require('../middleware/validate');
const { reportLimiter } = require('../middleware/rateLimiter');
const { LIMITS, REPORT_REASONS, REPORT_TARGET_TYPES } = require('../config/constants');

const { createReport, getMyReports } = require('../controllers/reportController');

router.post(
    '/',
    protect,
    reportLimiter,
    validateBody({
        reportedUser: { required: true, type: 'string' },
        targetType:   { type: 'string', enum: REPORT_TARGET_TYPES },
        targetId:     { type: 'string' },
        reason:       { required: true, type: 'string', enum: Object.values(REPORT_REASONS) },
        description:  { type: 'string', max: LIMITS.REPORT_DESCRIPTION_MAX }
    }),
    createReport
);

router.get('/mine', protect, getMyReports);

module.exports = router;
