const User               = require('../models/User');
const Skill              = require('../models/Skill');
const asyncHandler       = require('../utils/asyncHandler');
const userMetricsService = require('../services/userMetricsService');
const { normalizeName, getFullNameError } = require('../utils/nameValidation');

// @desc    Get the current user's full profile
// @route   GET /api/users/profile
// @access  Private
const getMyProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.id).populate('skills.skillId');

    res.status(200).json({ success: true, user });
});

// @desc    Get another user's public profile
// @route   GET /api/users/profile/:id
// @access  Private
const getPublicProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id).populate('skills.skillId');

    if (!user || !user.isActive) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, user });
});

// @desc    Update the current user's profile fields
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = asyncHandler(async (req, res) => {
    const { fullName, headline, about, location } = req.body;

    const updates = {};

    // The real-name rule applies only when the name is being changed, so
    // users whose legacy names predate the rule can still save other fields
    // (the edit form always resends the current name).
    if (fullName !== undefined && fullName !== normalizeName(req.user.fullName)) {
        const nameError = getFullNameError(fullName);
        if (nameError) {
            return res.status(400).json({ success: false, message: nameError });
        }
        updates.fullName = fullName;
    }

    if (headline !== undefined) updates.headline = headline;
    if (about    !== undefined) updates.about    = about;
    if (location !== undefined) updates.location = location;

    const user = await User.findByIdAndUpdate(req.user.id, updates, {
        new:            true,
        runValidators:  true
    }).populate('skills.skillId');

    // Recompute and persist profile completion synchronously so the
    // updated score is visible immediately on the next profile fetch.
    await userMetricsService.updateProfileCompletion(req.user.id, user);

    res.status(200).json({
        success: true,
        message: 'Profile updated successfully',
        user
    });
});

// @desc    Upload/replace the current user's avatar
// @route   PUT /api/users/avatar
// @access  Private
const updateAvatar = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const avatarPath = req.file.path;
    
    const user = await User.findByIdAndUpdate(
        req.user.id,
        { avatar: avatarPath },
        { new: true }
    ).populate('skills.skillId');

    // Avatar contributes 20 points to completion — recompute after upload.
    await userMetricsService.updateProfileCompletion(req.user.id, user);

    res.status(200).json({
        success: true,
        message: 'Avatar updated successfully',
        user
    });
});

// @desc    Replace the current user's weekly availability
// @route   PUT /api/users/availability
// @access  Private
const updateAvailability = asyncHandler(async (req, res) => {
    const { availability } = req.body;

    if (!Array.isArray(availability)) {
        return res.status(400).json({
            success: false,
            message: 'Availability must be an array'
        });
    }

    const user = await User.findByIdAndUpdate(
        req.user.id,
        { availability },
        { new: true, runValidators: true }
    );

    // Availability is not part of the profile completion score, so no
    // recomputation is needed here.

    res.status(200).json({
        success: true,
        message: 'Availability updated successfully',
        user
    });
});

// @desc    Add a skill (teach or learn) to the current user's profile
// @route   POST /api/users/skills
// @access  Private
const addUserSkill = asyncHandler(async (req, res) => {
    const { skillId, type, proficiency } = req.body;

    const skill = await Skill.findById(skillId);
    if (!skill) {
        return res.status(404).json({ success: false, message: 'Skill not found in catalog' });
    }

    const user = await User.findById(req.user.id);

    const alreadyAdded = user.skills.some(
        (s) => s.skillId.toString() === skillId && s.type === type
    );

    if (alreadyAdded) {
        return res.status(400).json({
            success: false,
            message: `This skill is already in your ${type} list`
        });
    }

    user.skills.push({ skillId, type, proficiency });
    await user.save();
    await user.populate('skills.skillId');

    // Skills affect two profile completion categories (teachSkill, learnSkill)
    // — recompute after every skill change.
    await userMetricsService.updateProfileCompletion(req.user.id, user);

    res.status(200).json({
        success: true,
        message: 'Skill added successfully',
        user
    });
});

// @desc    Remove a skill from the current user's profile
// @route   DELETE /api/users/skills/:skillId/:type
// @access  Private
const removeUserSkill = asyncHandler(async (req, res) => {
    const { skillId, type } = req.params;

    const user = await User.findById(req.user.id);

    user.skills = user.skills.filter(
        (s) => !(s.skillId.toString() === skillId && s.type === type)
    );

    await user.save();
    await user.populate('skills.skillId');

    // A user may drop below the teach or learn threshold after removal.
    await userMetricsService.updateProfileCompletion(req.user.id, user);

    res.status(200).json({
        success: true,
        message: 'Skill removed successfully',
        user
    });
});

module.exports = {
    getMyProfile,
    getPublicProfile,
    updateProfile,
    updateAvatar,
    updateAvailability,
    addUserSkill,
    removeUserSkill
};