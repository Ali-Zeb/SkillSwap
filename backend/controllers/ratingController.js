const Rating             = require('../models/Rating');
const Session            = require('../models/Session');
const User               = require('../models/User');
const { SESSION_STATUS } = require('../config/constants');
const asyncHandler       = require('../utils/asyncHandler');
const reputationService  = require('../services/reputationService');

/**
 * Returns the Socket.io instance registered on the Express app.
 * Using req.app.get('io') avoids circular imports — controllers never
 * import the server module directly.
 */
const getIo = (req) => req.app.get('io') || null;

// @desc    Submit a rating for a completed session
// @route   POST /api/ratings
// @access  Private
const submitRating = asyncHandler(async (req, res) => {
    const { sessionId, revieweeId, rating, comment } = req.body;
    const reviewerId = req.user.id;

    const session = await Session.findById(sessionId);
    if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (!session.isParticipant(reviewerId)) {
        return res.status(403).json({
            success: false,
            message: 'Not authorized to rate this session'
        });
    }

    if (session.status !== SESSION_STATUS.COMPLETED) {
        return res.status(400).json({
            success: false,
            message: 'You can only rate completed sessions'
        });
    }

    const existing = await Rating.findOne({ sessionId, reviewerId });
    if (existing) {
        return res.status(400).json({
            success: false,
            message: 'You have already rated this session'
        });
    }

    // This try/catch is intentional: it gives a precise, user-facing
    // message for the duplicate-rating race condition caught by the
    // unique (sessionId, reviewerId) index on Rating.js.
    // Unknown errors are re-thrown to asyncHandler/errorHandler.js.
    let newRating;
    try {
        newRating = await Rating.create({
            reviewerId,
            revieweeId,
            sessionId,
            rating,
            comment: comment || ''
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'You have already rated this session'
            });
        }
        throw error;
    }

    await newRating.populate('reviewerId', 'fullName avatar');

    // Run the full reputation pipeline (recalculate reputation, evaluate
    // badges, persist new badges, send notifications) asynchronously after
    // the response is sent. This avoids blocking the 201 response on the
    // additional DB queries inside processNewRating.
    // See reputationService.js for the consistency tradeoff documentation.
    reputationService
        .processNewRating(revieweeId, getIo(req))
        .catch((err) => console.error('reputationService.processNewRating failed:', err.message));

    res.status(201).json({
        success: true,
        message: 'Rating submitted successfully',
        rating:  newRating
    });
});

// @desc    Get all ratings received by a specific user
// @route   GET /api/ratings/user/:userId
// @access  Public
const getUserRatings = asyncHandler(async (req, res) => {
    const ratings = await Rating.find({ revieweeId: req.params.userId })
        .populate('reviewerId', 'fullName avatar')
        .populate('sessionId', 'title')
        .sort({ createdAt: -1 });

    const average = ratings.length > 0
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length
        : 0;

    res.status(200).json({
        success:       true,
        count:         ratings.length,
        averageRating: Math.round(average * 10) / 10,
        ratings
    });
});

module.exports = { submitRating, getUserRatings };