const User                = require('../models/User');
const Rating              = require('../models/Rating');
const Session             = require('../models/Session');
const Request             = require('../models/Request');
const evaluateBadges      = require('../utils/badgeEvaluator');
const notificationService = require('./notificationService');
const { SESSION_STATUS, BADGE_META } = require('../config/constants');

/**
 * ReputationService
 *
 * Orchestrates the full post-rating pipeline:
 *   1. Recompute average reputation from all received ratings
 *   2. Assemble statistics needed for badge evaluation
 *   3. Evaluate which badges the user has earned
 *   4. Persist newly earned badges to the user document
 *   5. Send a notification for each newly earned badge
 *
 * Entry point: processNewRating(revieweeId, io)
 *
 * CONSISTENCY NOTE:
 * processNewRating() is called fire-and-forget from ratingController
 * after the 201 response is sent. This means:
 *   - The HTTP client receives the rating confirmation immediately.
 *   - The reputation and badge updates complete within milliseconds
 *     but are not guaranteed to be visible in a GET request issued
 *     in the same event loop tick as the POST response.
 * In practice this is imperceptible to the user. The tradeoff is
 * accepted because processNewRating now runs 5 DB queries (vs 1 in
 * the old inline recalculateReputation), and blocking the response
 * on all of them would add latency with no user-visible benefit.
 */

// ---------------------------------------------------------------------------
// Private helpers — not exported
// ---------------------------------------------------------------------------

/**
 * Computes the arithmetic mean of all ratings for a user.
 * Returns 0 if the user has no ratings yet.
 *
 * @param {Rating[]} ratings
 * @returns {number}  Rounded to 1 decimal place
 */
const _computeAverage = (ratings) => {
    if (ratings.length === 0) return 0;
    const sum = ratings.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / ratings.length) * 10) / 10;
};

/**
 * Writes the new reputation value to the user document.
 *
 * @param {string|ObjectId} userId
 * @param {number}          average
 */
const _persistReputation = async (userId, average) => {
    await User.findByIdAndUpdate(userId, { reputation: average });
};

/**
 * Assembles the statistics object required by badgeEvaluator.
 * Runs the minimum number of DB queries needed, reusing the ratings
 * array that was already fetched by the caller.
 *
 * @param {string|ObjectId} userId
 * @param {Rating[]}        ratings   All ratings received by this user (already fetched)
 * @param {number}          average   Already-computed average (avoids recomputing)
 * @returns {Promise<object>}         Stats object ready for evaluateBadges()
 */
const _assembleStats = async (userId, ratings, average) => {
    const [sessionsAsTeacher, completedSessions, totalRequestsReceived, user] =
        await Promise.all([
            Session.countDocuments({ teacherId: userId, status: SESSION_STATUS.COMPLETED }),
            Session.countDocuments({
                $or: [{ teacherId: userId }, { learnerId: userId }],
                status: SESSION_STATUS.COMPLETED
            }),
            Request.countDocuments({ receiverId: userId }),
            // Select only the fields needed for badge evaluation — avoid loading
            // the full user document (skills array, availability, etc.)
            User.findById(userId).select('skills responseRate badges').lean()
        ]);

    // last5Ratings: the 5 most recent rating values for the perfect-score check.
    // Ratings are already fetched; sort by createdAt descending, take first 5.
    const last5Ratings = ratings
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map((r) => r.rating);

    const teachSkillsCount = Array.isArray(user?.skills)
        ? user.skills.filter((s) => s.type === 'teach').length
        : 0;

    return {
        averageRating:         average,
        totalRatingsCount:     ratings.length,
        sessionsAsTeacher,
        completedSessions,
        teachSkillsCount,
        responseRate:          user?.responseRate ?? 0,
        totalRequestsReceived,
        last5Ratings,
        existingBadgeTypes:    (user?.badges ?? []).map((b) => b.type)
    };
};

/**
 * Compares newly evaluated badges against the user's existing badges,
 * persists any that are new, and sends a notification for each one.
 *
 * Only badges the user does not already hold are written to the database,
 * making this function safely re-entrant (calling it twice does not
 * duplicate badges).
 *
 * @param {string|ObjectId}             userId
 * @param {{ type, earnedAt }[]}        evaluatedBadges    All currently earned badges
 * @param {string[]}                    existingBadgeTypes Types the user already holds
 * @param {object|null}                 io                 Socket.io instance
 */
const _persistNewBadges = async (userId, evaluatedBadges, existingBadgeTypes, io) => {
    const newBadges = evaluatedBadges.filter(
        (b) => !existingBadgeTypes.includes(b.type)
    );

    if (newBadges.length === 0) return;

    // Push all newly earned badges in one update
    await User.findByIdAndUpdate(userId, {
        $push: { badges: { $each: newBadges } }
    });

    // Send a notification for each new badge.
    // Use presentation data from BADGE_META — never from the stored document.
    for (const badge of newBadges) {
        const meta = BADGE_META[badge.type];
        if (!meta) continue;

        notificationService
            .badgeEarned(userId, meta.label, meta.icon, io)
            .catch((err) =>
                console.error(`badgeEarned notification failed (${badge.type}):`, err.message)
            );
    }
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Runs the full post-rating pipeline for a user who just received a new rating.
 *
 * Designed to be called fire-and-forget from ratingController:
 *
 *   reputationService
 *       .processNewRating(revieweeId, io)
 *       .catch((err) => console.error('reputationService failed:', err.message));
 *
 * The caller does not await this function so the HTTP response is not
 * delayed by the DB queries inside. See CONSISTENCY NOTE at the top of
 * this file for the tradeoff explanation.
 *
 * @param {string|ObjectId} revieweeId   The user who received the rating
 * @param {object|null}     io           Socket.io server instance (may be null)
 */
const processNewRating = async (revieweeId, io) => {
    // Fetch all ratings once — reused by both _computeAverage and _assembleStats
    const ratings = await Rating.find({ revieweeId }).lean();

    const average = _computeAverage(ratings);

    // Run reputation persistence and stats assembly in parallel
    const [, stats] = await Promise.all([
        _persistReputation(revieweeId, average),
        _assembleStats(revieweeId, ratings, average)
    ]);

    const evaluatedBadges = evaluateBadges(stats);

    await _persistNewBadges(revieweeId, evaluatedBadges, stats.existingBadgeTypes, io);
};

module.exports = { processNewRating };