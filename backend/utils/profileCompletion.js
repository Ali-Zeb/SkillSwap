const { PROFILE_COMPLETION_WEIGHTS } = require('../config/constants');

/**
 * Computes a profile completion score for a user document.
 *
 * Pure function — no database access, no side effects.
 * The caller is responsible for persisting the returned score.
 *
 * The `skills` array may contain either populated skill objects
 * ({ skillId: { _id, name }, type }) or raw sub-documents
 * ({ skillId: ObjectId, type }). The function only reads `s.type`
 * so it works correctly in both cases.
 *
 * @param {object} user  A Mongoose user document or plain user object.
 * @returns {number}     Integer 0–100.
 */
const computeProfileCompletion = (user) => {
    const w = PROFILE_COMPLETION_WEIGHTS;
    let score = 0;

    if (user.avatar    && user.avatar.trim())    score += w.avatar;
    if (user.headline  && user.headline.trim())  score += w.headline;
    if (user.about     && user.about.trim())     score += w.about;
    if (user.location  && user.location.trim())  score += w.location;

    const skills = Array.isArray(user.skills) ? user.skills : [];
    if (skills.some((s) => s.type === 'teach')) score += w.teachSkill;
    if (skills.some((s) => s.type === 'learn')) score += w.learnSkill;

    return Math.min(score, 100);
};

module.exports = computeProfileCompletion;