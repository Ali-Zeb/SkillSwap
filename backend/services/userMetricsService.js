const User                     = require('../models/User');
const Request                  = require('../models/Request');
const computeProfileCompletion = require('../utils/profileCompletion');

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Persists an updated profile completion score for a user.
 *
 * Accepts the already-updated user document so no extra database read
 * is needed. The caller (userController) has the document in memory
 * immediately after saving profile changes.
 *
 * Called with `await` so the score is written before the HTTP response
 * is sent — the frontend sees the correct value on the next profile fetch.
 *
 * @param {string|ObjectId} userId      The user's MongoDB _id
 * @param {object}          userDoc     The updated Mongoose document or plain object
 * @returns {Promise<number>}           The computed score (0–100)
 */
const updateProfileCompletion = async (userId, userDoc) => {
    const score = computeProfileCompletion(userDoc);

    await User.findByIdAndUpdate(userId, { profileCompletion: score });

    return score;
};

/**
 * Recalculates and persists a user's response rate.
 *
 * Response rate = requests responded to within 24 h / total requests received.
 *
 * Design decisions:
 *   - Unanswered requests (no respondedAt) count against the rate.
 *     A user who ignores requests should not maintain a high rate.
 *   - Only requests received by this user are counted (receiverId === userId).
 *   - If the user has received no requests, rate stays 0 to avoid division
 *     by zero and to prevent inflating rate from a single fast response.
 *   - Uses two countDocuments() calls instead of loading all documents into
 *     memory. Semantically identical to the previous implementation but avoids
 *     loading request documents at scale.
 *
 * Compatibility:
 *   - $expr supported in MongoDB 3.6+ (Atlas M0 runs MongoDB 6.0+).
 *   - $subtract on two Date fields returns difference in milliseconds.
 *   - Mongoose 7+ passes countDocuments filters to the driver unchanged.
 *   - Semantic equivalence verified against the original JS filter logic.
 *
 * Called fire-and-forget from requestController (.catch logged) because
 * responseRate is a background metric — a failed update should not fail
 * the accept/decline API response.
 *
 * @param {string|ObjectId} userId   The user whose rate should be recalculated
 * @returns {Promise<number>}        The computed rate (0.0–1.0)
 */
const updateResponseRate = async (userId) => {
    const [total, respondedWithin24h] = await Promise.all([
        Request.countDocuments({ receiverId: userId }),
        Request.countDocuments({
            receiverId:  userId,
            respondedAt: { $exists: true },
            $expr: {
                $lte: [
                    { $subtract: ['$respondedAt', '$createdAt'] },
                    MS_PER_DAY
                ]
            }
        })
    ]);

    if (total === 0) {
        return 0;
    }

    const rate = Math.round((respondedWithin24h / total) * 100) / 100;

    await User.findByIdAndUpdate(userId, { responseRate: rate });

    return rate;
};

module.exports = {
    updateProfileCompletion,
    updateResponseRate
};