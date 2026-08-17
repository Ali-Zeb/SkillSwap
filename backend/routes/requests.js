const express = require('express');
const router  = express.Router();
const { protect }      = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { LIMITS }       = require('../config/constants');

const {
    sendRequest,
    acceptRequest,
    declineRequest,
    getIncomingRequests,
    getSentRequests,
    getConnections
} = require('../controllers/requestController');

// Named paths must come before the dynamic /:userId param so Express
// does not match "incoming", "sent", or "connections" as a userId.
router.get('/incoming',    protect, getIncomingRequests);
router.get('/sent',        protect, getSentRequests);
router.get('/connections', protect, getConnections);

router.post(
    '/:userId',
    protect,
    validateBody({
        skillId: { type: 'string' },
        message: { type: 'string', max: LIMITS.REQUEST_MESSAGE_MAX }
    }),
    sendRequest
);

router.put('/:requestId/accept',  protect, acceptRequest);
router.put('/:requestId/decline', protect, declineRequest);

module.exports = router;