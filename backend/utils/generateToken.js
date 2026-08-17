const jwt = require('jsonwebtoken');

/**
 * Signs a JWT containing the user's id, expiring per JWT_EXPIRE in .env.
 */
const generateToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE || '30d'
    });
};

module.exports = generateToken;