const mongoose = require('mongoose');
const { LIMITS, SESSION_STATUS, SESSION_TYPES } = require('../config/constants');

const SessionSchema = new mongoose.Schema({
    teacherId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true
    },
    learnerId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true
    },
    skillId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'Skill',
        required: true
    },
    /**
     * The user who created or last rescheduled this session proposal.
     * Used to:
     *   - Identify who the "other participant" is in approve/decline handlers
     *   - Prevent a proposer from approving their own proposal
     *   - Route notifications back to the correct user
     *
     * Not required so that sessions created before this field existed
     * (status: 'scheduled') continue to load and save without errors.
     * The approve/decline handlers guard against a missing proposedBy.
     */
    proposedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref:  'User'
    },
    title: {
        type:      String,
        required:  [true, 'Session title is required'],
        trim:      true,
        maxlength: [LIMITS.SESSION_TITLE_MAX, `Title cannot exceed ${LIMITS.SESSION_TITLE_MAX} characters`]
    },
    description: {
        type:      String,
        maxlength: [LIMITS.SESSION_DESCRIPTION_MAX, `Description cannot exceed ${LIMITS.SESSION_DESCRIPTION_MAX} characters`],
        default:   ''
    },
    date: {
        type:     Date,
        required: [true, 'Session date is required']
    },
    duration: {
        type:     Number,   // minutes
        required: [true, 'Session duration is required'],
        min:      [15,  'Session must be at least 15 minutes'],
        max:      [240, 'Session cannot exceed 4 hours']
    },
    sessionType: {
        type:    String,
        enum:    SESSION_TYPES,
        default: 'online'
    },
    meetingLink: {
        type:    String,
        default: ''
    },
    location: {
        type:    String,
        default: ''
    },
    status: {
        type:    String,
        enum:    Object.values(SESSION_STATUS),
        default: SESSION_STATUS.PENDING_APPROVAL
    },
    cancelReason: {
        type:    String,
        default: ''
    }
}, {
    timestamps: true
});

SessionSchema.index({ teacherId: 1, date: 1 });
SessionSchema.index({ learnerId: 1, date: 1 });
// Admin analytics: sessions created per day, outcomes by scheduled date.
SessionSchema.index({ createdAt: -1 });
SessionSchema.index({ status: 1, date: 1 });

/**
 * Checks whether a given userId is a participant (teacher or learner) in
 * this session.
 *
 * Works correctly whether teacherId/learnerId are:
 *   - Raw ObjectIds (not populated) — uses .toString() directly
 *   - Populated Mongoose documents  — extracts ._id first, then .toString()
 *
 * The original implementation called this.teacherId.toString() on a populated
 * document, which returned "[object Object]" instead of the id string, causing
 * every approve/decline/cancel/complete endpoint to return 403 Forbidden.
 */
SessionSchema.methods.isParticipant = function (userId) {
    // A populated ref is null when that user was deleted — treat it as
    // "no participant" rather than throwing on .toString().
    const idOf = (ref) => (ref ? (ref._id || ref).toString() : null);

    return idOf(this.teacherId) === userId.toString() ||
           idOf(this.learnerId) === userId.toString();
};

module.exports = mongoose.model('Session', SessionSchema);