const express = require('express');
const router  = express.Router();

const { protect, userOnly } = require('../middleware/auth');
const { validateBody }      = require('../middleware/validate');
const { supportLimiter }    = require('../middleware/rateLimiter');
const { LIMITS, SUPPORT_CATEGORIES, PUBLIC_SUPPORT_CATEGORIES } = require('../config/constants');
const {
    createTicket, createPublicTicket, getMyTickets, getMyTicket, replyToMyTicket
} = require('../controllers/supportController');

const messageRule = { required: true, type: 'string', min: 10, max: LIMITS.SUPPORT_MESSAGE_MAX, transform: (v) => (typeof v === 'string' ? v.trim() : v) };

// Public contact form — no login (locked-out / deactivated users).
router.post(
    '/public',
    supportLimiter,
    validateBody({
        name:     { required: true, type: 'string', min: 2, max: 50, transform: (v) => (typeof v === 'string' ? v.trim() : v) },
        email:    { required: true, type: 'email' },
        category: { required: true, type: 'string', enum: PUBLIC_SUPPORT_CATEGORIES },
        message:  messageRule
    }),
    createPublicTicket
);

// Member tickets.
router.use(protect, userOnly);

router.get('/mine', getMyTickets);
router.post(
    '/',
    supportLimiter,
    validateBody({
        category: { required: true, type: 'string', enum: SUPPORT_CATEGORIES },
        subject:  { required: true, type: 'string', min: 3, max: LIMITS.SUPPORT_SUBJECT_MAX, transform: (v) => (typeof v === 'string' ? v.trim() : v) },
        message:  messageRule
    }),
    createTicket
);
router.get('/:id', getMyTicket);
router.post(
    '/:id/messages',
    supportLimiter,
    validateBody({ body: { required: true, type: 'string', min: 1, max: LIMITS.SUPPORT_MESSAGE_MAX, transform: (v) => (typeof v === 'string' ? v.trim() : v) } }),
    replyToMyTicket
);

module.exports = router;
