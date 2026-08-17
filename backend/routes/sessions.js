const express = require('express');
const router  = express.Router();
const { protect }      = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { LIMITS, SESSION_TYPES } = require('../config/constants');

const {
    createSession,
    approveSession,
    declineSession,
    rescheduleSession,
    getUpcomingSessions,
    getPastSessions,
    getSessionById,
    updateSession,
    cancelSession,
    completeSession
} = require('../controllers/sessionController');

// Specific named paths must come before the dynamic /:id param so
// Express does not match "upcoming" or "past" as an :id value.
router.get('/upcoming', protect, getUpcomingSessions);
router.get('/past',     protect, getPastSessions);

router.post(
    '/',
    protect,
    validateBody({
        teacherId:   { required: true, type: 'string' },
        learnerId:   { required: true, type: 'string' },
        skillId:     { required: true, type: 'string' },
        title:       { required: true, type: 'string', min: 2, max: LIMITS.SESSION_TITLE_MAX },
        description: { type: 'string', max: LIMITS.SESSION_DESCRIPTION_MAX },
        date:        { required: true, type: 'string' },
        duration:    { required: true, type: 'number', min: 15, max: 240 },
        sessionType: { type: 'string', enum: SESSION_TYPES },
        meetingLink: { type: 'string' },
        location:    { type: 'string' }
    }),
    createSession
);

router.get('/:id', protect, getSessionById);

router.put(
    '/:id',
    protect,
    validateBody({
        title:       { type: 'string', min: 2, max: LIMITS.SESSION_TITLE_MAX },
        description: { type: 'string', max: LIMITS.SESSION_DESCRIPTION_MAX },
        date:        { type: 'string' },
        duration:    { type: 'number', min: 15, max: 240 },
        sessionType: { type: 'string', enum: SESSION_TYPES },
        meetingLink: { type: 'string' },
        location:    { type: 'string' }
    }),
    updateSession
);

// Session approval workflow
router.put('/:id/approve', protect, approveSession);
router.put('/:id/decline', protect, declineSession);
router.put(
    '/:id/reschedule',
    protect,
    validateBody({
        date:        { required: true, type: 'string' },
        duration:    { type: 'number', min: 15, max: 240 },
        meetingLink: { type: 'string' },
        location:    { type: 'string' }
    }),
    rescheduleSession
);

router.put('/:id/cancel',   protect, cancelSession);
router.put('/:id/complete', protect, completeSession);

module.exports = router;