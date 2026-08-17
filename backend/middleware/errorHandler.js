/**
 * Centralized error-handling middleware. Must be registered LAST in
 * server.js (after all routes) so Express routes errors here.
 *
 * Normalizes common Mongoose/JWT error shapes into a consistent
 * { success, message } response instead of each controller having
 * to handle every error type itself.
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;

    console.error('Error:', err);

    // Mongoose bad ObjectId (e.g. /api/users/not-a-valid-id)
    if (err.name === 'CastError') {
        error.message = 'Resource not found';
        error.statusCode = 404;
    }

    // Mongoose duplicate key (e.g. unique email already exists)
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        error.message = `Duplicate value for ${field}. Please use another value`;
        error.statusCode = 400;
    }

    // Mongoose schema validation errors
    if (err.name === 'ValidationError') {
        error.message = Object.values(err.errors).map((val) => val.message).join(', ');
        error.statusCode = 400;
    }

    // JWT errors (in case they bubble up here instead of being caught in auth.js)
    if (err.name === 'JsonWebTokenError') {
        error.message = 'Invalid token';
        error.statusCode = 401;
    }

    if (err.name === 'TokenExpiredError') {
        error.message = 'Token expired';
        error.statusCode = 401;
    }

    res.status(error.statusCode || 500).json({
        success: false,
        message: error.message || 'Server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

/**
 * Catches requests to undefined routes and forwards a clean 404
 * to errorHandler instead of Express's default HTML error page.
 */
const notFound = (req, res, next) => {
    const error = new Error(`Route not found - ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

module.exports = { errorHandler, notFound };