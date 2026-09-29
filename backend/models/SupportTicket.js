const mongoose = require('mongoose');
const { LIMITS, SUPPORT_CATEGORIES, SUPPORT_STATUS, SUPPORT_PRIORITY } = require('../config/constants');

const MessageSchema = new mongoose.Schema({
    sender:   { type: String, enum: ['user', 'admin'], required: true },
    // Null for messages from the public /contact form (no account).
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    body: {
        type:      String,
        required:  [true, 'Message is required'],
        trim:      true,
        maxlength: [LIMITS.SUPPORT_MESSAGE_MAX, `Message cannot exceed ${LIMITS.SUPPORT_MESSAGE_MAX} characters`]
    },
    createdAt: { type: Date, default: Date.now }
}, { _id: true });

const SupportTicketSchema = new mongoose.Schema({
    // Set for tickets opened while signed in; null for the public form.
    user:  { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name:  { type: String, required: true, trim: true, maxlength: 50 },
    email: { type: String, required: true, trim: true, lowercase: true },
    category: { type: String, enum: SUPPORT_CATEGORIES, required: true },
    subject: {
        type:      String,
        required:  [true, 'Subject is required'],
        trim:      true,
        maxlength: [LIMITS.SUPPORT_SUBJECT_MAX, `Subject cannot exceed ${LIMITS.SUPPORT_SUBJECT_MAX} characters`]
    },
    status:   { type: String, enum: Object.values(SUPPORT_STATUS), default: SUPPORT_STATUS.OPEN },
    priority: { type: String, enum: SUPPORT_PRIORITY, default: 'normal' },   // admin-set
    messages: { type: [MessageSchema], default: [] },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // True while the latest message is from the user (drives the admin badge).
    awaitingAdmin: { type: Boolean, default: true },
    // First admin reply — used for the average first-response time.
    firstResponseAt: { type: Date, default: null },
    source: { type: String, enum: ['app', 'public'], default: 'app' }
}, {
    timestamps: true
});

SupportTicketSchema.index({ status: 1, createdAt: -1 });
SupportTicketSchema.index({ user: 1, createdAt: -1 });
SupportTicketSchema.index({ createdAt: -1 });
SupportTicketSchema.index({ awaitingAdmin: 1, status: 1 });

module.exports = mongoose.model('SupportTicket', SupportTicketSchema);
