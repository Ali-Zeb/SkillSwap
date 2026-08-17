/**
 * Wraps an async Express route handler so any thrown error or rejected
 * promise is automatically forwarded to next(), where the centralized
 * errorHandler middleware (middleware/errorHandler.js) takes over.
 *
 * Usage:
 *   const getMe = asyncHandler(async (req, res) => {
 *       res.status(200).json({ success: true, user: req.user });
 *   });
 *
 * Without this, every controller needs its own try/catch block that
 * duplicates the same console.error + res.status(500).json(...) pattern.
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
