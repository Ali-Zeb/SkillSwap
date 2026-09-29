/**
 * Centralized error-handling middleware. Must be registered LAST in
 * server.js (after all routes) so Express routes errors here.
 *
 * Normalizes common Mongoose/JWT error shapes into a consistent
 * { success, message } response instead of each controller having
 * to handle every error type itself.
 */
const errorHandler = (err, req, res, next) => {
    // Full error (including stack and any filesystem/driver detail) is
    // logged here only — never sent in the response body. Node/Mongoose
    // internals (e.g. ENOENT from a missing file) don't set `.statusCode`,
    // so anything not explicitly recognized below falls through to the
    // generic 500 message instead of leaking raw error.message to the client.
    console.error('Error:', err);

    let statusCode = 500;
    let message = 'Server error';

    // Mongoose bad ObjectId (e.g. /api/users/not-a-valid-id)
    if (err.name === 'CastError') {
        statusCode = 400;
        message = err.kind === 'ObjectId' ? 'Invalid id format' : `Invalid value for ${err.path}`;
    }

    // Mongoose duplicate key (e.g. unique email already exists)
    else if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        statusCode = 400;
        message = `Duplicate value for ${field}. Please use another value`;
    }

    // Mongoose schema validation errors
    else if (err.name === 'ValidationError') {
        statusCode = 400;
        message = Object.values(err.errors).map((val) => val.message).join(', ');
    }

    // JWT errors (in case they bubble up here instead of being caught in auth.js)
    else if (err.name === 'JsonWebTokenError') {
        statusCode = 401;
        message = 'Invalid token';
    }

    else if (err.name === 'TokenExpiredError') {
        statusCode = 401;
        message = 'Token expired';
    }

    // Deliberately thrown by our own code (e.g. the notFound middleware
    // below) with an already-safe, user-facing message. Node/Mongoose/driver
    // errors never set `.statusCode`, so this branch can't be reached by
    // unexpected internal errors.
    else if (err.statusCode) {
        statusCode = err.statusCode;
        message = err.message;
    }

    res.status(statusCode).json({ success: false, message });
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