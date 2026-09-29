const SupportTicket       = require('../models/SupportTicket');
const User                = require('../models/User');
const notificationService = require('./notificationService');
const emailService        = require('./emailService');
const emailTemplates      = require('../utils/emailTemplates');
const { clientUrl }       = require('../utils/authTokens');
const { SUPPORT_STATUS }  = require('../config/constants');

/**
 * Side effects shared by the member, public and admin support endpoints:
 * notifications and emails. Every function is fire-and-forget safe
 * (errors are logged, never thrown to the request).
 */

const ticketUrl = (ticket) => (ticket.user ? `${clientUrl()}/support/${ticket._id}` : null);

const logFailure = (what) => (error) => console.error(`${what} failed:`, error.message);

// New ticket: notify admins in-app; confirm to the requester by email.
const onTicketCreated = (ticket, io) => {
    notificationService.supportTicketNew(ticket, io).catch(logFailure('supportTicketNew notification'));
    emailService
        .sendEmail({
            to: { email: ticket.email, name: ticket.name },
            ...emailTemplates.supportReceived({ name: ticket.name, subject: ticket.subject, url: ticketUrl(ticket) })
        })
        .catch(logFailure('Support confirmation email'));
};

// Admin replied or resolved: in-app notification (members) + email (everyone).
const onAdminUpdate = (ticket, { excerpt = '', resolved = false }, io) => {
    if (ticket.user) {
        notificationService.supportReply(ticket.user, ticket, resolved, io).catch(logFailure('supportReply notification'));
    }
    emailService
        .sendEmail({
            to: { email: ticket.email, name: ticket.name },
            ...emailTemplates.supportReply({
                name: ticket.name, subject: ticket.subject, url: ticketUrl(ticket), resolved,
                excerpt: excerpt.length > 400 ? excerpt.slice(0, 399) + '…' : excerpt
            })
        })
        .catch(logFailure('Support reply email'));
};

// Tickets that need an admin: latest message from the user and not closed.
const countAwaitingAdmin = () =>
    SupportTicket.countDocuments({ awaitingAdmin: true, status: { $ne: SUPPORT_STATUS.CLOSED } });

const isActiveAdmin = (id) => User.exists({ _id: id, role: 'admin', isActive: true });

module.exports = { onTicketCreated, onAdminUpdate, countAwaitingAdmin, isActiveAdmin };
