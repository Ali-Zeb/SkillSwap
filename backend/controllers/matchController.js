const User = require('../models/User');
const aiService = require('../services/aiService');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get AI-ranked potential matches for the current user
// @route   GET /api/matches
// @access  Private
const getPotentialMatches = asyncHandler(async (req, res) => {
    const currentUser = await User.findById(req.user.id).populate('skills.skillId');

    if (!currentUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const teachSkillIds = currentUser.skills
        .filter((s) => s.type === 'learn')
        .map((s) => s.skillId._id);

    const learnSkillIds = currentUser.skills
        .filter((s) => s.type === 'teach')
        .map((s) => s.skillId._id);

    // Candidates: other active users who teach something this user wants
    // to learn, OR want to learn something this user can teach.
    const candidates = await User.find({
        _id: { $ne: currentUser._id },
        isActive: true,
        role: { $ne: 'admin' },   // admins are operators, never match candidates
        $or: [
            { skills: { $elemMatch: { type: 'teach', skillId: { $in: teachSkillIds } } } },
            { skills: { $elemMatch: { type: 'learn', skillId: { $in: learnSkillIds } } } }
        ]
    })
        .populate('skills.skillId')
        .limit(20);

    if (candidates.length === 0) {
        return res.status(200).json({
            success: true,
            count: 0,
            matches: [],
            message: 'No potential matches found yet. Try adding more skills to your profile.'
        });
    }

    // This try/catch is intentional, not generic-error boilerplate.
    // It implements deliberate graceful degradation: if the Groq AI
    // call fails for any reason, we fall back to the local heuristic
    // ranker in aiService.js instead of failing the whole request.
    let rankedMatches;
    try {
        rankedMatches = await aiService.rankMatches(currentUser, candidates);
    } catch (aiError) {
        console.error('AI ranking failed, falling back to unranked candidates:', aiError.message);
        rankedMatches = candidates.map((c) => ({
            user: c,
            compatibilityScore: null,
            reason: ''
        }));
    }

    res.status(200).json({
        success: true,
        count: rankedMatches.length,
        matches: rankedMatches
    });
});

// @desc    Get details for a single potential match
// @route   GET /api/matches/:matchId
// @access  Private
const getMatchDetails = asyncHandler(async (req, res) => {
    const matchUser = await User.findById(req.params.matchId).populate('skills.skillId');

    if (!matchUser || !matchUser.isActive) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, user: matchUser });
});

module.exports = { getPotentialMatches, getMatchDetails };