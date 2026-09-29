const mongoose = require('mongoose');
const { LIMITS, REPORT_REASONS, REPORT_STATUS, REPORT_TARGET_TYPES } = require('../config/constants');

const ReportSchema = new mongoose.Schema({
    reporter: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true
    },
    reportedUser: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true
    },
    /**
     * What the report is about. For 'session' and 'message', targetId
     * points at that document; for 'user' it is left empty.
     */
    targetType: {
        type:    String,
        enum:    REPORT_TARGET_TYPES,
        default: 'user'
    },
    targetId: {
        type:    mongoose.Schema.Types.ObjectId,
        default: null
    },
    reason: {
        type:     String,
        enum:     Object.values(REPORT_REASONS),
        required: [true, 'Reason is required']
    },
    description: {
        type:      String,
        trim:      true,
        maxlength: [LIMITS.REPORT_DESCRIPTION_MAX, `Description cannot exceed ${LIMITS.REPORT_DESCRIPTION_MAX} characters`],
        default:   ''
    },
    status: {
        type:    String,
        enum:    Object.values(REPORT_STATUS),
        default: REPORT_STATUS.PENDING
    },
    reviewedBy: {
        type:    mongoose.Schema.Types.ObjectId,
        ref:     'User',
        default: null
    },
    resolutionNote: {
        type:      String,
        trim:      true,
        maxlength: [LIMITS.RESOLUTION_NOTE_MAX, `Resolution note cannot exceed ${LIMITS.RESOLUTION_NOTE_MAX} characters`],
        default:   ''
    }
}, {
    timestamps: true
});

// Admin queue: filter by status, newest first.
ReportSchema.index({ status: 1, createdAt: -1 });
// All reports against one user (admin review, repeat-offender checks).
ReportSchema.index({ reportedUser: 1, createdAt: -1 });
// "My reports" view.
ReportSchema.index({ reporter: 1, createdAt: -1 });
// At most one pending report per reporter + target; also closes the race
// between the controller's duplicate check and the insert.
ReportSchema.index(
    { reporter: 1, reportedUser: 1, targetType: 1, targetId: 1 },
    { unique: true, partialFilterExpression: { status: REPORT_STATUS.PENDING } }
);

module.exports = mongoose.model('Report', ReportSchema);
