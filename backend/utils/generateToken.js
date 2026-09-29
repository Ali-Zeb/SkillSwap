const jwt = require('jsonwebtoken');

/**
 * Signs a JWT containing the user's id, expiring per JWT_EXPIRE in .env.
 *
 * `iatMs` is the issue time in milliseconds. The standard `iat` claim only
 * has second precision, which can't tell whether a token was issued just
 * before or just after a password reset in the same second.
 */
const generateToken = (userId) => {
    return jwt.sign({ id: userId, iatMs: Date.now() }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};

/**
 * True when the decoded token was issued before `changedAt` (a password
 * reset), i.e. it must no longer be accepted. Tokens issued before
 * `iatMs` existed fall back to `iat` (seconds).
 */
const isTokenIssuedBefore = (decoded, changedAt) => {
    if (!changedAt) return false;
    const issuedMs = typeof decoded.iatMs === 'number' ? decoded.iatMs : decoded.iat * 1000;
    return issuedMs < new Date(changedAt).getTime();
};

module.exports = generateToken;
module.exports.isTokenIssuedBefore = isTokenIssuedBefore;
