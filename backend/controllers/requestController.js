const Request             = require('../models/Request');
const User                = require('../models/User');
const { REQUEST_STATUS }  = require('../config/constants');
const asyncHandler        = require('../utils/asyncHandler');
const notificationService = require('../services/notificationService');
const userMetricsService  = require('../services/userMetricsService');

/**
 * Returns the Socket.io instance registered on the Express app.
 * Using req.app.get('io') avoids circular imports — controllers never
 * import the server module directly.
 */
const getIo = (req) => req.app.get('io') || null;

// @desc    Send a connection request to another user
// @route   POST /api/requests/:userId
// @access  Private
const sendRequest = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const { skillId, message } = req.body;
    const senderId = req.user.id;

    if (userId === senderId) {
        return res.status(400).json({
            success: false,
            message: 'You cannot send a request to yourself'
        });
    }

    const receiver = await User.findById(userId);
    if (!receiver || !receiver.isActive) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const existing = await Request.findOne({
        senderId,
        receiverId: userId,
        status: REQUEST_STATUS.PENDING
    });

    if (existing) {
        return res.status(400).json({
            success: false,
            message: 'A pending request already exists for this user'
        });
    }

    // This try/catch is intentional: it gives a precise, user-facing
    // message for the duplicate-pending-request race condition caught
    // by the unique partial index on Request.js. Unknown errors are
    // re-thrown so asyncHandler forwards them to errorHandler.js.
    let request;
    try {
        request = await Request.create({
            senderId,
            receiverId: userId,
            skillId:    skillId || undefined,
            message:    message || ''
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'A pending request already exists for this user'
            });
        }
        throw error;
    }

    await request.populate([
        { path: 'senderId',   select: 'fullName avatar headline' },
        { path: 'receiverId', select: 'fullName avatar headline' },
        { path: 'skillId',    select: 'name category'            }
    ]);

    // Notify the receiver that a new request has arrived.
    notificationService
        .requestReceived(userId, req.user.fullName, request._id, getIo(req))
        .catch((err) => console.error('requestReceived notification failed:', err.message));

    res.status(201).json({
        success: true,
        message: `Connection request sent to ${receiver.fullName}`,
        request
    });
});

// @desc    Accept a connection request
// @route   PUT /api/requests/:requestId/accept
// @access  Private
const acceptRequest = asyncHandler(async (req, res) => {
    const request = await Request.findById(req.params.requestId);

    if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.receiverId.toString() !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to respond to this request'
        });
    }

    if (request.status !== REQUEST_STATUS.PENDING) {
        return res.status(400).json({
            success: false,
            message: `Request has already been ${request.status}`
        });
    }

    request.status      = REQUEST_STATUS.ACCEPTED;
    request.respondedAt = Date.now();
    await request.save();

    // Notify the sender that their request was accepted.
    notificationService
        .requestAccepted(request.senderId, req.user.fullName, req.user.id, getIo(req))
        .catch((err) => console.error('requestAccepted notification failed:', err.message));

    // Recalculate the acceptor's response rate.
    userMetricsService
        .updateResponseRate(req.user.id)
        .catch((err) => console.error('updateResponseRate (accept) failed:', err.message));

    res.status(200).json({
        success: true,
        message: 'Connection request accepted',
        request
    });
});

// @desc    Decline a connection request
// @route   PUT /api/requests/:requestId/decline
// @access  Private
const declineRequest = asyncHandler(async (req, res) => {
    const request = await Request.findById(req.params.requestId);

    if (!request) {
        return res.status(404).json({ success: false, message: 'Request not found' });
    }

    if (request.receiverId.toString() !== req.user.id) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to respond to this request'
        });
    }

    if (request.status !== REQUEST_STATUS.PENDING) {
        return res.status(400).json({
            success: false,
            message: `Request has already been ${request.status}`
        });
    }

    request.status      = REQUEST_STATUS.DECLINED;
    request.respondedAt = Date.now();
    await request.save();

    // Notify the sender that their request was declined.
    notificationService
        .requestDeclined(request.senderId, req.user.fullName, getIo(req))
        .catch((err) => console.error('requestDeclined notification failed:', err.message));

    // Declining counts as a response — update responseRate.
    userMetricsService
        .updateResponseRate(req.user.id)
        .catch((err) => console.error('updateResponseRate (decline) failed:', err.message));

    res.status(200).json({
        success: true,
        message: 'Connection request declined',
        request
    });
});

// @desc    Get pending requests received by the current user
// @route   GET /api/requests/incoming
// @access  Private
const getIncomingRequests = asyncHandler(async (req, res) => {
    const requests = await Request.find({
        receiverId: req.user.id,
        status:     REQUEST_STATUS.PENDING
    })
        .populate('senderId', 'fullName avatar headline reputation')
        .populate('skillId',  'name category')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count:   requests.length,
        requests
    });
});

// @desc    Get all requests sent by the current user
// @route   GET /api/requests/sent
// @access  Private
const getSentRequests = asyncHandler(async (req, res) => {
    const requests = await Request.find({ senderId: req.user.id })
        .populate('receiverId', 'fullName avatar headline reputation')
        .populate('skillId',    'name category')
        .sort({ createdAt: -1 });

    res.status(200).json({
        success: true,
        count:   requests.length,
        requests
    });
});

// @desc    Get all accepted connections for the current user (both directions)
// @route   GET /api/requests/connections
// @access  Private
//
// Returns every request where the current user is sender OR receiver and
// status is accepted. The response normalises each result into a
// { partner } shape so the caller never needs to inspect which direction
// the original request travelled.
const getConnections = asyncHandler(async (req, res) => {
    const requests = await Request.find({
        $or: [
            { senderId:   req.user.id },
            { receiverId: req.user.id }
        ],
        status: REQUEST_STATUS.ACCEPTED
    })
        .populate('senderId',   'fullName avatar headline')
        .populate('receiverId', 'fullName avatar headline')
        .sort({ respondedAt: -1 });

    // Normalise: give the caller a `partner` field that always points to
    // the other user, regardless of whether this user sent or received.
    const connections = requests.map((r) => {
        const isSender = r.senderId._id.toString() === req.user.id;
        const partner  = isSender ? r.receiverId : r.senderId;
        return {
            _id:          r._id,
            partner:      partner,
            respondedAt:  r.respondedAt,
            createdAt:    r.createdAt
        };
    });

    res.status(200).json({
        success:     true,
        count:       connections.length,
        connections
    });
});

module.exports = {
    sendRequest,
    acceptRequest,
    declineRequest,
    getIncomingRequests,
    getSentRequests,
    getConnections
};