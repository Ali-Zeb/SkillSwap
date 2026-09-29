const mongoose          = require('mongoose');
const User              = require('../models/User');
const asyncHandler      = require('../utils/asyncHandler');
const reputationService = require('../services/reputationService');
const { BADGE_META, BADGE_THRESHOLDS } = require('../config/constants');

// ---------------------------------------------------------------------------
// @desc    Badge catalogue (labels, icons, requirements, thresholds)
// @route   GET /api/badges/meta
// @access  Private
// ---------------------------------------------------------------------------
const getBadgeMeta = asyncHandler(async (req, res) => {
    res.status(200).json({
        success:    true,
        badges:     Object.entries(BADGE_META).map(([type, meta]) => ({ type, ...meta })),
        thresholds: BADGE_THRESHOLDS
    });
});

// ---------------------------------------------------------------------------
// @desc    Earned + locked badges for a user, with progress toward each
// @route   GET /api/badges/user/:userId
// @access  Private
// ---------------------------------------------------------------------------
const getUserBadges = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
        return res.status(400).json({ success: false, message: 'Invalid id format' });
    }

    const exists = await User.exists({ _id: userId, isActive: true });
    if (!exists) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const badges = await reputationService.getBadgeProgress(userId);
    res.status(200).json({
        success:     true,
        earnedCount: badges.filter((b) => b.earned).length,
        total:       badges.length,
        badges
    });
});

module.exports = { getBadgeMeta, getUserBadges };
