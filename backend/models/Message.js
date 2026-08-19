const mongoose = require('mongoose');
const { LIMITS } = require('../config/constants');

const MessageSchema = new mongoose.Schema({
    senderId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true,
    },
    receiverId: {
        type:     mongoose.Schema.Types.ObjectId,
        ref:      'User',
        required: true,
    },
    content: {
        type:      String,
        trim:      true,
        maxlength: [LIMITS.MESSAGE_CONTENT_MAX, `Message cannot exceed ${LIMITS.MESSAGE_CONTENT_MAX} characters`],
        // Not individually required — a message must have content OR fileUrl (see pre-validate hook)
    },
    // File attachment fields — only set for file messages
    fileUrl: {
        type:    String,
        default: null,
    },
    fileName: {
        type:    String,
        default: null,
    },
    fileType: {
        type:    String,
        default: null,
    },
    fileSize: {
        type:    Number,
        default: null,
    },
    // Cloudinary resource type ('image' or 'raw') — tells the frontend how
    // the file was stored so it can decide how to link/preview it.
    fileResourceType: {
        type:    String,
        default: null,
    },
    isRead: {
        type:    Boolean,
        default: false,
    },
    readAt: {
        type: Date,
    },
}, {
    timestamps: true,
});

// A message must have either text content or a file attachment.
// This replaces the individual `required: true` on content, which was
// too strict — it prevented file-only messages from saving.
MessageSchema.pre('validate', function (next) {
    if (!this.content && !this.fileUrl) {
        next(new Error('Message must have either content or a file attachment'));
    } else {
        next();
    }
});

// Index for conversation lookup (both directions) and unread counts
MessageSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });
MessageSchema.index({ receiverId: 1, isRead: 1 });

module.exports = mongoose.model('Message', MessageSchema);