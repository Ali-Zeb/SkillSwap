const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { isTokenIssuedBefore } = require('../utils/generateToken');

/**
 * Verifies the Bearer JWT on the request, attaches the authenticated
 * user to req.user, and rejects the request if the token is missing,
 * invalid, expired, or belongs to a deactivated/deleted account.
 */
const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Not authorized, no token'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }

        if (!user.isActive) {
            return res.status(401).json({
                success: false,
                code:    'ACCOUNT_DEACTIVATED',
                message: 'Your account has been deactivated'
            });
        }

        // A password reset revokes every JWT issued before it.
        if (isTokenIssuedBefore(decoded, user.passwordChangedAt)) {
            return res.status(401).json({
                success: false,
                code:    'TOKEN_REVOKED',
                message: 'Your password was changed. Please log in again.'
            });
        }

        req.user = user;

        // Fire-and-forget activity timestamp update.
        // Intentionally not awaited and uses updateOne (not user.save())
        // so we don't re-run schema validators/hooks on every request.
        User.updateOne({ _id: user._id }, { lastActive: Date.now() }).catch((err) => {
            console.error('lastActive update failed:', err.message);
        });

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Token expired, please log in again'
            });
        }

        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }

        console.error('Auth Middleware Error:', error.message);
        return res.status(401).json({
            success: false,
            message: 'Not authorized'
        });
    }
};

/**
 * Restricts a route to specific user roles.
 * Usage: router.delete('/:id', protect, authorize('admin'), deleteUser)
 * Requires User model to have a `role` field; safe to use even before
 * an admin panel exists since unused routes simply won't apply it yet.
 */
const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to access this resource'
            });
        }
        next();
    };
};

module.exports = { protect, authorize };