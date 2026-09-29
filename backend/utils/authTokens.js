const crypto = require('crypto');

/**
 * Single-use tokens for email verification and password reset.
 * The raw token only ever goes into the emailed link; the database stores
 * its SHA-256 hash, so a leaked database cannot be used to verify or reset.
 */
const hashToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');

const createToken = (ttlMs) => {
    const token = crypto.randomBytes(32).toString('hex');
    return { token, hash: hashToken(token), expires: new Date(Date.now() + ttlMs) };
};

// A raw token is 64 hex chars; anything else can be rejected without a DB query.
const isWellFormedToken = (token) => typeof token === 'string' && /^[a-f0-9]{64}$/.test(token);

const clientUrl = () => (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');

module.exports = { hashToken, createToken, isWellFormedToken, clientUrl };
