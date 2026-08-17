const mongoose = require('mongoose');
const { NOTIFICATION_TYPES, LIMITS } = require('../config/constants');

const NotificationSchema = new mongoose.Schema(
    {
        userId: {
            type:     mongoose.Schema.Types.ObjectId,
            ref:      'User',
            required: [true, 'User is required'],
            index:    true
        },
        type: {
            type:     String,
            enum:     Object.values(NOTIFICATION_TYPES),
            required: [true, 'Notification type is required']
        },
        title: {
            type:      String,
            required:  [true, 'Title is required'],
            maxlength: [LIMITS.NOTIFICATION_TITLE_MAX, `Title cannot exceed ${LIMITS.NOTIFICATION_TITLE_MAX} characters`],
            trim:      true
        },
        message: {
            type:      String,
            required:  [true, 'Message is required'],
            maxlength: [LIMITS.NOTIFICATION_MESSAGE_MAX, `Message cannot exceed ${LIMITS.NOTIFICATION_MESSAGE_MAX} characters`],
            trim:      true
        },
        /**
         * Frontend route the user navigates to when clicking the notification.
         * Example: '/requests', '/sessions', '/messages/64abc123'
         */
        link: {
            type:    String,
            default: '/',
            trim:    true
        },
        /**
         * Optional structured payload for inline actions (e.g. Accept/Decline
         * buttons rendered directly inside the notification dropdown).
         */
        data: {
            type:    mongoose.Schema.Types.Mixed,
            default: null
        },
        read: {
            type:    Boolean,
            default: false
        },
        /**
         * Soft-delete flag — the document stays in the database for audit
         * purposes but is excluded from all user-facing queries.
         */
        deleted: {
            type:    Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

// Most common query: all unread notifications for a user, newest first.
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

// Auto-expire notifications after 90 days to prevent unbounded growth.
NotificationSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 90 * 24 * 60 * 60 }
);

module.exports = mongoose.model('Notification', NotificationSchema);