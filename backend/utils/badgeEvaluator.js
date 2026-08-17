const { BADGE_TYPES, BADGE_THRESHOLDS } = require('../config/constants');

/**
 * Evaluates which badges a user has earned based on their statistics.
 *
 * Pure function — no database access, no side effects.
 * The caller (reputationService) is responsible for:
 *   - Assembling the stats object from the database
 *   - Comparing returned badges against already-earned badges
 *   - Persisting newly earned badges and sending notifications
 *
 * Returned badge objects contain only { type, earnedAt } — the fields
 * stored in MongoDB. Presentation data (label, icon) is in BADGE_META
 * in constants.js and is never stored in the database.
 *
 * @param {object} stats
 * @param {number} stats.averageRating           Current average star rating (0–5)
 * @param {number} stats.totalRatingsCount       Total ratings received
 * @param {number} stats.sessionsAsTeacher       Completed sessions as teacher
 * @param {number} stats.completedSessions       Total completed sessions
 * @param {number} stats.teachSkillsCount        Number of teach skills on profile
 * @param {number} stats.responseRate            Request response rate (0.0–1.0)
 * @param {number} stats.totalRequestsReceived   Total incoming connection requests
 * @param {number[]} stats.last5Ratings          Up to 5 most recent rating values
 *
 * @returns {{ type: string, earnedAt: Date }[]}
 *   Array of badge objects for all badges the user currently qualifies for.
 *   The caller diffs this against already-earned badges to find new ones.
 */
const evaluateBadges = (stats) => {
    const T       = BADGE_THRESHOLDS;
    const now     = new Date();
    const earned  = [];

    const badge = (type) => earned.push({ type, earnedAt: now });

    // First Session — completed at least 1 session in any role
    if (stats.completedSessions >= T.FIRST_SESSION_MIN_COMPLETED) {
        badge(BADGE_TYPES.FIRST_SESSION);
    }

    // Expert Mentor — taught 10 or more completed sessions
    if (stats.sessionsAsTeacher >= T.EXPERT_MENTOR_MIN_TAUGHT) {
        badge(BADGE_TYPES.EXPERT_MENTOR);
    }

    // Top Teacher — high average rating with meaningful teaching history
    if (
        stats.averageRating          >= T.TOP_TEACHER_MIN_RATING &&
        stats.sessionsAsTeacher      >= T.TOP_TEACHER_MIN_SESSIONS_TAUGHT
    ) {
        badge(BADGE_TYPES.TOP_TEACHER);
    }

    // Highly Rated — strong average over a significant number of ratings
    if (
        stats.averageRating      >= T.HIGHLY_RATED_MIN_RATING &&
        stats.totalRatingsCount  >= T.HIGHLY_RATED_MIN_RATINGS_COUNT
    ) {
        badge(BADGE_TYPES.HIGHLY_RATED);
    }

    // Perfect Score — every rating in the last N sessions is 5 stars.
    // Only evaluated if the user has received at least PERFECT_SCORE_WINDOW ratings.
    if (
        stats.last5Ratings.length >= T.PERFECT_SCORE_WINDOW &&
        stats.last5Ratings.every((r) => r === 5)
    ) {
        badge(BADGE_TYPES.PERFECT_SCORE);
    }

    // Fast Responder — responds quickly to most incoming requests.
    // Unanswered requests count against the rate (responseRate < 1.0
    // when any request goes unanswered). Requires a minimum request volume
    // to prevent a single quick response inflating the rate to 1.0.
    if (
        stats.responseRate             >= T.FAST_RESPONDER_MIN_RATE &&
        stats.totalRequestsReceived    >= T.FAST_RESPONDER_MIN_REQUESTS
    ) {
        badge(BADGE_TYPES.FAST_RESPONDER);
    }

    // Skill Master — offers to teach a wide range of skills
    if (stats.teachSkillsCount >= T.SKILL_MASTER_MIN_TEACH_SKILLS) {
        badge(BADGE_TYPES.SKILL_MASTER);
    }

    return earned;
};

module.exports = evaluateBadges;