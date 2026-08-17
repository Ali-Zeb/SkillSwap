const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { LIMITS } = require('../config/constants');

const { submitRating, getUserRatings } = require('../controllers/ratingController');

router.post(
    '/',
    protect,
    validateBody({
        sessionId: { required: true, type: 'string' },
        revieweeId: { required: true, type: 'string' },
        rating: { required: true, type: 'number', min: 1, max: 5 },
        comment: { type: 'string', max: LIMITS.RATING_COMMENT_MAX }
    }),
    submitRating
);

// Public: viewing someone's rating history doesn't require authentication,
// consistent with getPublicProfile in userController.
router.get('/user/:userId', getUserRatings);

module.exports = router;