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

module.exports = { generalLimiter, authLimiter }