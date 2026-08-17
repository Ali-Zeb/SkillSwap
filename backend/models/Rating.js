const mongoose = require('mongoose');
const { LIMITS } = require('../config/constants');

const RatingSchema = new mongoose.Schema({
    reviewerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    revieweeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sessionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Session',
        required: true
    },
    rating: {
        type: Number,
        required: [true, 'Rating value is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5']
    },
    comment: {
        type: String,
        maxlength: [LIMITS.RATING_COMMENT_MAX, `Comment cannot exceed ${LIMITS.RATING_COMMENT_MAX} characters`],
        default: ''
    }
}, {
    timestamps: true
});

// One rating per reviewer per session — prevents a single user from
// submitting multiple ratings for the same session to inflate/deflate
// the other person's reputation.
RatingSchema.index({ sessionId: 1, reviewerId: 1 }, { unique: true });
RatingSchema.index({ revieweeId: 1 });

module.exports = mongoose.model('Rating', RatingSchema);