const mongoose = require('mongoose');
const { REQUEST_STATUS } = require('../config/constants');

const RequestSchema = new mongoose.Schema({
    senderId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true
    },
    receiverId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true
    },
    skillId: {
        type: mongoose.Schema.Types.ObjectId,
        ref:  'Skill'
    },
    status: {
        type:    String,
        enum:    Object.values(REQUEST_STATUS),
        default: REQUEST_STATUS.PENDING
    },
    message: {
        type:    String,
        default: ''
    },
    respondedAt: {
        type: Date
    }
}, {
    timestamps: true
});

// Prevents duplicate pending requests between the same two users.
// Uses a partial filter so accepted/declined pairs are not affected.
RequestSchema.index(
    { senderId: 1, receiverId: 1, status: 1 },
    { unique: true, partialFilterExpression: { status: 'pending' } }
);

// Supports efficient lookup of all requests received by a user.
// Required by userMetricsService.updateResponseRate() which queries
// { receiverId: userId } across all statuses — the compound index above
// cannot serve this query because it has a partial filter on status: 'pending'.
RequestSchema.index({ receiverId: 1 });

RequestSchema.methods.isParticipant = function (userId) {
    return this.senderId.toString() === userId.toString() ||
        this.receiverId.toString() === userId.toString();
};

module.exports = mongoose.model('Request', RequestSchema);