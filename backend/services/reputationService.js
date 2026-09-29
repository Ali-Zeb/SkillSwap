const User                = require('../models/User');
const Rating              = require('../models/Rating');
const Session             = require('../models/Session');
const Request             = require('../models/Request');
const evaluateBadges      = require('../utils/badgeEvaluator');
const notificationService = require('./notificationService');
const { SESSION_STATUS, BADGE_META, BADGE_THRESHOLDS } = require('../config/constants');

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
const _persistNewBadges = async (userId, evaluatedBadges, existingBadgeTypes, io, notify = true) => {
    const newBadges = evaluatedBadges.filter(
        (b) => !existingBadgeTypes.includes(b.type)
    );

    if (newBadges.length === 0) return;

    // Push only badges not already stored. The type filter makes this safe
    // when two pipeline runs for the same user overlap.
    for (const badge of newBadges) {
        await User.updateOne(
            { _id: userId, 'badges.type': { $ne: badge.type } },
            { $push: { badges: badge } }
        );
    }

    if (!notify) return;

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
/**
 * Full reputation + badge pipeline for one user: recomputes reputation,
 * evaluates every badge, persists newly earned ones and (unless
 * options.notify is false) notifies the user. Safe to call repeatedly —
 * already-earned badges are never duplicated.
 *
 * Triggered after a rating (processNewRating), after a session is
 * completed (sessionController), and by scripts/reevaluateBadges.js.
 *
 * @param {string|ObjectId} userId
 * @param {object|null}     io
 * @param {{ notify?: boolean }} [options]
 * @returns {Promise<string[]>} Types of the badges newly awarded
 */
const evaluateUserBadges = async (userId, io, { notify = true } = {}) => {
    // Fetch all ratings once — reused by both _computeAverage and _assembleStats
    const ratings = await Rating.find({ revieweeId: userId }).lean();

    const average = _computeAverage(ratings);

    // Run reputation persistence and stats assembly in parallel
    const [, stats] = await Promise.all([
        _persistReputation(userId, average),
        _assembleStats(userId, ratings, average)
    ]);

    const evaluatedBadges = evaluateBadges(stats);
    const newTypes = evaluatedBadges
        .map((b) => b.type)
        .filter((type) => !stats.existingBadgeTypes.includes(type));

    await _persistNewBadges(userId, evaluatedBadges, stats.existingBadgeTypes, notify ? io : null, notify);
    return newTypes;
};

const processNewRating = (revieweeId, io) => evaluateUserBadges(revieweeId, io);

/**
 * Earned and locked badges for a user, each with its requirement and the
 * user's current progress toward it. Read-only.
 */
const getBadgeProgress = async (userId) => {
    const ratings = await Rating.find({ revieweeId: userId }).select('rating createdAt').lean();
    const stats   = await _assembleStats(userId, ratings, _computeAverage(ratings));
    const user    = await User.findById(userId).select('badges').lean();
    const earnedAt = new Map((user?.badges || []).map((b) => [b.type, b.earnedAt]));
    const T = BADGE_THRESHOLDS;

    const ratio = (value, target) => Math.max(0, Math.min(1, target > 0 ? value / target : 0));
    const round1 = (n) => Math.round(n * 10) / 10;

    // Each badge's progress is the weakest of its conditions.
    const progressFor = {
        first_session:  [ratio(stats.completedSessions, T.FIRST_SESSION_MIN_COMPLETED),
            `${stats.completedSessions}/${T.FIRST_SESSION_MIN_COMPLETED} completed session`],
        expert_mentor:  [ratio(stats.sessionsAsTeacher, T.EXPERT_MENTOR_MIN_TAUGHT),
            `${stats.sessionsAsTeacher}/${T.EXPERT_MENTOR_MIN_TAUGHT} sessions taught`],
        top_teacher:    [Math.min(ratio(stats.sessionsAsTeacher, T.TOP_TEACHER_MIN_SESSIONS_TAUGHT), ratio(stats.averageRating, T.TOP_TEACHER_MIN_RATING)),
            `${stats.sessionsAsTeacher}/${T.TOP_TEACHER_MIN_SESSIONS_TAUGHT} taught · rating ${round1(stats.averageRating)}/${T.TOP_TEACHER_MIN_RATING}`],
        highly_rated:   [Math.min(ratio(stats.totalRatingsCount, T.HIGHLY_RATED_MIN_RATINGS_COUNT), ratio(stats.averageRating, T.HIGHLY_RATED_MIN_RATING)),
            `${stats.totalRatingsCount}/${T.HIGHLY_RATED_MIN_RATINGS_COUNT} ratings · average ${round1(stats.averageRating)}/${T.HIGHLY_RATED_MIN_RATING}`],
        perfect_score:  [ratio(stats.last5Ratings.every((r) => r === 5) ? stats.last5Ratings.length : 0, T.PERFECT_SCORE_WINDOW),
            `${stats.last5Ratings.every((r) => r === 5) ? stats.last5Ratings.length : 0}/${T.PERFECT_SCORE_WINDOW} five-star ratings in a row`],
        fast_responder: [Math.min(ratio(stats.totalRequestsReceived, T.FAST_RESPONDER_MIN_REQUESTS), ratio(stats.responseRate, T.FAST_RESPONDER_MIN_RATE)),
            `${stats.totalRequestsReceived}/${T.FAST_RESPONDER_MIN_REQUESTS} requests · ${Math.round(stats.responseRate * 100)}%/${Math.round(T.FAST_RESPONDER_MIN_RATE * 100)}% answered in 24h`],
        skill_master:   [ratio(stats.teachSkillsCount, T.SKILL_MASTER_MIN_TEACH_SKILLS),
            `${stats.teachSkillsCount}/${T.SKILL_MASTER_MIN_TEACH_SKILLS} skills offered to teach`]
    };

    return Object.entries(BADGE_META).map(([type, meta]) => {
        const [progress, progressLabel] = progressFor[type] || [0, ''];
        const earned = earnedAt.has(type);
        return {
            type,
            label:       meta.label,
            icon:        meta.icon,
            description: meta.description,
            earned,
            earnedAt:    earned ? earnedAt.get(type) : null,
            progress:    earned ? 1 : Math.round(progress * 100) / 100,
            progressLabel
        };
    });
};

module.exports = { processNewRating, evaluateUserBadges, getBadgeProgress };