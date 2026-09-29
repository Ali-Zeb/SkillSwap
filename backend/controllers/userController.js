const User               = require('../models/User');
const Skill              = require('../models/Skill');
const asyncHandler       = require('../utils/asyncHandler');
const userMetricsService = require('../services/userMetricsService');
const reputationService  = require('../services/reputationService');
const emailService       = require('../services/emailService');
const emailTemplates     = require('../utils/emailTemplates');
const generateToken      = require('../utils/generateToken');
const { clientUrl }      = require('../utils/authTokens');
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
// Only these fields are ever returned for another user's profile — never
// email, role, account status, or any auth/security fields.
const PUBLIC_PROFILE_FIELDS = [
    'fullName', 'avatar', 'headline', 'about', 'location', 'skills',
    'availability', 'reputation', 'badges', 'responseRate', 'lastActive', 'createdAt'
].join(' ');

const getPublicProfile = asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
        .select(`${PUBLIC_PROFILE_FIELDS} isActive role`)
        .populate('skills.skillId', 'name category');

    // Admin accounts are operators, not members, and have no public profile.
    if (!user || !user.isActive || user.role === 'admin') {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    // isActive/role were selected only for the check above — strip them.
    const { isActive, role, ...publicUser } = user.toJSON();
    res.status(200).json({ success: true, user: publicUser });
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

// @desc    Change the current user's password (requires the current one)
// @route   PUT /api/users/password
// @access  Private
const changePassword = asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
        return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
    if (currentPassword === newPassword) {
        return res.status(400).json({ success: false, message: 'The new password must be different from the current one' });
    }

    user.password          = newPassword;   // hashed by the pre-save hook
    user.passwordChangedAt = new Date();    // revokes every token issued before now
    await user.save({ validateModifiedOnly: true });

    // Other devices' open sockets were authenticated with revoked tokens.
    const io = req.app.get('io');
    if (io) io.in(`user_${user._id}`).disconnectSockets(true);

    emailService
        .sendEmail({
            to: { email: user.email, name: user.fullName },
            ...emailTemplates.passwordChanged({ name: user.fullName, loginUrl: `${clientUrl()}/login` })
        })
        .catch((error) => console.error('Password changed email failed:', error.message));

    // A fresh token keeps this browser signed in; all others are signed out.
    res.status(200).json({
        success: true,
        message: 'Password updated. You have been signed out on your other devices.',
        token:   generateToken(user._id)
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

    // Skill Master depends on the number of teach skills.
    if (type === 'teach') {
        reputationService
            .evaluateUserBadges(req.user.id, req.app.get('io') || null)
            .catch((err) => console.error('evaluateUserBadges (add skill) failed:', err.message));
    }

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
    changePassword,
    getPublicProfile,
    updateProfile,
    updateAvatar,
    updateAvailability,
    addUserSkill,
    removeUserSkill
};