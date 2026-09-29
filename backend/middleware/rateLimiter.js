const rateLimit = require('express-rate-limit')

/**
 * General limiter applied to all API routes.
 * Matches the name your server.js already imports: { generalLimiter }
 */
const generalLimiter = rateLimit({
    windowMs: 60 * 1000,   // 1 minute
    max:      200,
    message:  { success: false, message: 'Too many requests. Please slow down.' },
    standardHeaders: true,
    legacyHeaders:   false,
})

/**
 * Strict limiter for login and register endpoints.
 * 10 attempts per IP per 15 minutes.
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max:      10,
    message:  { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders:   false,
})

/**
 * Report submissions: 10 successful reports per user per hour. Must run
 * after `protect` so the limit is per account rather than per shared IP.
 * Rejected attempts (validation errors, duplicates) don't use up the quota;
 * generalLimiter still caps raw request volume.
 */
const reportLimiter = rateLimit({
    windowMs:     60 * 60 * 1000,
    max:          10,
    keyGenerator: (req) => `report_${req.user.id}`,
    skipFailedRequests: true,
    message:      { success: false, message: 'You have submitted too many reports. Please try again later.' },
    standardHeaders: true,
    legacyHeaders:   false,
})

/**
 * Emails sent on request (resend verification, forgot password):
 * 5 per IP per 15 minutes, to stop inbox flooding and enumeration probing.
 */
const emailLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max:      5,
    message:  { success: false, message: 'Too many email requests. Please try again in 15 minutes.' },
    standardHeaders: true,
    legacyHeaders:   false,
})

/**
 * New support tickets and replies: 10 per hour per client (IP for the public
 * form, user id when signed in). Rejected attempts don't count.
 */
const supportLimiter = rateLimit({
    windowMs:     60 * 60 * 1000,
    max:          10,
    keyGenerator: (req) => (req.user ? `support_${req.user.id}` : `support_ip_${req.ip}`),
    skipFailedRequests: true,
    message:      { success: false, message: 'Too many support messages. Please try again later.' },
    standardHeaders: true,
    legacyHeaders:   false,
})

module.exports = { generalLimiter, authLimiter, reportLimiter, emailLimiter, supportLimiter }