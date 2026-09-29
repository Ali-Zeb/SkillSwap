const mongoose = require('mongoose');
const { AUDIT_ACTIONS } = require('../config/constants');

/**
 * Append-only record of every admin action. Never updated or deleted by
 * the application.
 */
const AuditLogSchema = new mongoose.Schema({
    actor: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true
    },
    action: {
        type:     String,
        enum:     Object.values(AUDIT_ACTIONS),
        required: true
    },
    targetType: {
        type:     String,
        enum:     ['user', 'report', 'session'],
        required: true
    },
    targetId: {
        type:     mongoose.Schema.Types.ObjectId,
        required: true
    },
    metadata: {
        type:    mongoose.Schema.Types.Mixed,
        default: {}
    }
}, {
    timestamps: { createdAt: true, updatedAt: false }
});

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ actor: 1, createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
