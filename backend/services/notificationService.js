const Notification           = require('../models/Notification');
const User                   = require('../models/User');
const { NOTIFICATION_TYPES, REPORT_REASON_LABELS } = require('../config/constants');

/**
 * NotificationService
 *
 * All notification creation goes through this service.
 * Controllers call the named factory methods — they never construct
 * Notification documents directly, which keeps notification logic in
 * one place and prevents type/message drift.
 *
 * Real-time delivery: when the Socket.io `io` instance is passed,
 * the notification is emitted to the recipient's personal room immediately
 * after being saved to MongoDB.
 *
 * Room name pattern: "user_<userId>" — must match the join call in
 * socket/index.js: socket.join(`user_${socket.userId}`)
 *
 * If `io` is null/undefined (e.g. called from a script without a live
 * server), the notification is still persisted and will appear the next
 * time the user polls GET /api/notifications.
 */

// ---------------------------------------------------------------------------
// Core creator — all public factory methods delegate here
// ---------------------------------------------------------------------------

/**
 * Creates and optionally delivers a notification in real-time.
 *
 * @param {string|ObjectId} userId   Recipient's MongoDB _id
 * @param {string}          type     One of NOTIFICATION_TYPES values
 * @param {string}          title    Short headline (≤ LIMITS.NOTIFICATION_TITLE_MAX)
 * @param {string}          message  Notification body (≤ LIMITS.NOTIFICATION_MESSAGE_MAX)
 * @param {string}          link     Frontend route to navigate to on click
 * @param {object|null}     data     Optional payload for inline actions
 * @param {object|null}     io       Socket.io server instance
 * @returns {Promise<Notification>}
 */
const createNotification = async (userId, type, title, message, link, data, io) => {
    const notification = await Notification.create({
        userId,
        type,
        title,
        message,
        link:  link || '/',
        data:  data || null
    });

    if (io) {
        // Room name matches socket/index.js: socket.join(`user_${socket.userId}`)
        io.to(`user_${userId.toString()}`).emit('notification', {
            _id:       notification._id,
            type:      notification.type,
            title:     notification.title,
            message:   notification.message,
            link:      notification.link,
            data:      notification.data,
            read:      notification.read,
            createdAt: notification.createdAt
        });
    }

    return notification;
};

// ---------------------------------------------------------------------------
// Public factory methods — one per notification type
// ---------------------------------------------------------------------------

const requestReceived = (receiverId, senderName, requestId, io) =>
    createNotification(
        receiverId,
        NOTIFICATION_TYPES.REQUEST_RECEIVED,
        'New Connection Request',
        `${senderName} wants to connect with you.`,
        '/requests',
        { requestId: requestId.toString() },
        io
    );

const requestAccepted = (senderId, acceptorName, acceptorId, io) =>
    createNotification(
        senderId,
        NOTIFICATION_TYPES.REQUEST_ACCEPTED,
        'Request Accepted!',
        `${acceptorName} accepted your request. You can now chat and schedule sessions.`,
        `/messages/${acceptorId}`,
        { userId: acceptorId.toString() },
        io
    );

const requestDeclined = (senderId, declinerName, io) =>
    createNotification(
        senderId,
        NOTIFICATION_TYPES.REQUEST_DECLINED,
        'Request Declined',
        `${declinerName} declined your connection request.`,
        '/requests',
        null,
        io
    );

const sessionProposed = (receiverId, proposerName, sessionId, sessionTitle, sessionDate, io) => {
    const dateStr = new Date(sessionDate).toLocaleDateString('en-US', {
        weekday: 'short',
        month:   'short',
        day:     'numeric',
        hour:    '2-digit',
        minute:  '2-digit'
    });
    return createNotification(
        receiverId,
        NOTIFICATION_TYPES.SESSION_PROPOSED,
        'Session Invitation',
        `${proposerName} proposed "${sessionTitle}" on ${dateStr}.`,
        '/sessions',
        { sessionId: sessionId.toString() },
        io
    );
};

const sessionApproved = (proposerId, approverName, sessionId, sessionTitle, io) =>
    createNotification(
        proposerId,
        NOTIFICATION_TYPES.SESSION_APPROVED,
        'Session Confirmed!',
        `${approverName} confirmed "${sessionTitle}". It is now scheduled.`,
        '/sessions',
        { sessionId: sessionId.toString() },
        io
    );

const sessionDeclined = (proposerId, declinerName, sessionId, sessionTitle, io) =>
    createNotification(
        proposerId,
        NOTIFICATION_TYPES.SESSION_DECLINED,
        'Session Declined',
        `${declinerName} declined the session "${sessionTitle}".`,
        '/sessions',
        { sessionId: sessionId.toString() },
        io
    );

const sessionCancelled = (partnerId, cancellerName, sessionId, sessionTitle, io) =>
    createNotification(
        partnerId,
        NOTIFICATION_TYPES.SESSION_CANCELLED,
        'Session Cancelled',
        `${cancellerName} cancelled "${sessionTitle}".`,
        '/sessions',
        { sessionId: sessionId.toString() },
        io
    );

/**
 * Call once per participant after a session is completed.
 * The caller is responsible for passing the correct userId and partnerName
 * for each participant.
 */
const sessionCompleted = (userId, partnerName, sessionId, sessionTitle, io) =>
    createNotification(
        userId,
        NOTIFICATION_TYPES.SESSION_COMPLETED,
        'Rate Your Partner',
        `Your session "${sessionTitle}" with ${partnerName} is complete. Leave a rating.`,
        '/ratings',
        { sessionId: sessionId.toString() },
        io
    );

const ratingReceived = (userId, reviewerName, rating, sessionTitle, io) => {
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    return createNotification(
        userId,
        NOTIFICATION_TYPES.RATING_RECEIVED,
        'New Rating Received',
        `${reviewerName} gave you ${stars} for "${sessionTitle}".`,
        '/ratings',
        { rating },
        io
    );
};

/**
 * Only call this for users who are offline — online users receive
 * messages in real-time via the send-message socket event.
 */
const newMessage = (receiverId, senderName, senderId, preview, io) => {
    const body = preview.length > 80 ? `${preview.substring(0, 77)}...` : preview;
    return createNotification(
        receiverId,
        NOTIFICATION_TYPES.NEW_MESSAGE,
        `New message from ${senderName}`,
        body,
        `/messages/${senderId}`,
        { userId: senderId.toString() },
        io
    );
};

/**
 * Notifies every active admin that a new report was filed.
 * Each admin notification is independent — one failure does not stop the rest.
 */
const reportReceived = async (report, reportedUserName, io) => {
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
    const reasonLabel = REPORT_REASON_LABELS[report.reason] || report.reason;

    await Promise.allSettled(admins.map((admin) =>
        createNotification(
            admin._id,
            NOTIFICATION_TYPES.REPORT_RECEIVED,
            'New Report',
            `${reportedUserName} was reported for: ${reasonLabel}.`,
            '/admin/reports',
            { reportId: report._id },
            io
        )
    ));
};

const clip = (text, max) => (text.length > max ? text.slice(0, max - 1) + '…' : text);

/**
 * Notifies every active admin about a new support ticket.
 */
const supportTicketNew = async (ticket, io) => {
    const admins = await User.find({ role: 'admin', isActive: true }).select('_id').lean();
    await Promise.allSettled(admins.map((admin) =>
        createNotification(
            admin._id,
            NOTIFICATION_TYPES.SUPPORT_TICKET_NEW,
            'New Support Ticket',
            clip(`${ticket.name}: ${ticket.subject}`, 300),
            `/admin/support/${ticket._id}`,
            { ticketId: ticket._id },
            io
        )
    ));
};

/**
 * Tells a member the support team replied to (or resolved) their ticket.
 */
const supportReply = (userId, ticket, resolved, io) =>
    createNotification(
        userId,
        NOTIFICATION_TYPES.SUPPORT_REPLY,
        resolved ? 'Support request resolved' : 'Support replied',
        clip(`${resolved ? 'Resolved' : 'New reply'}: ${ticket.subject}`, 300),
        `/support/${ticket._id}`,
        { ticketId: ticket._id },
        io
    );

const badgeEarned = (userId, badgeLabel, badgeIcon, io) =>
    createNotification(
        userId,
        NOTIFICATION_TYPES.BADGE_EARNED,
        'Badge Earned!',
        `You earned the "${badgeLabel}" badge.`,
        '/profile',
        { badgeLabel, badgeIcon },
        io
    );

module.exports = {
    createNotification,
    requestReceived,
    requestAccepted,
    requestDeclined,
    sessionProposed,
    sessionApproved,
    sessionDeclined,
    sessionCancelled,
    sessionCompleted,
    ratingReceived,
    newMessage,
    badgeEarned,
    reportReceived,
    supportTicketNew,
    supportReply
};