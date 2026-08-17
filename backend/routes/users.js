const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { upload, handleUploadError } = require('../middleware/upload');
const { LIMITS, SKILL_TYPES } = require('../config/constants');

const {
    getMyProfile,
    getPublicProfile,
    updateProfile,
    updateAvatar,
    updateAvailability,
    addUserSkill,
    removeUserSkill
} = require('../controllers/userController');

router.get('/profile', protect, getMyProfile);
router.get('/profile/:id', protect, getPublicProfile);

router.put(
    '/profile',
    protect,
    validateBody({
        fullName: { type: 'string', min: 2, max: LIMITS.FULL_NAME_MAX },
        headline: { type: 'string', max: LIMITS.HEADLINE_MAX },
        about: { type: 'string', max: LIMITS.ABOUT_MAX },
        location: { type: 'string', max: 100 }
    }),
    updateProfile
);

router.put(
    '/avatar',
    protect,
    handleUploadError(upload.single('avatar')),
    updateAvatar
);

router.put(
    '/availability',
    protect,
    validateBody({
        availability: { required: true, type: 'array' }
    }),
    updateAvailability
);

router.post(
    '/skills',
    protect,
    validateBody({
        skillId: { required: true, type: 'string' },
        type: { required: true, type: 'string', enum: SKILL_TYPES }
    }),
    addUserSkill
);

router.delete('/skills/:skillId/:type', protect, removeUserSkill);

module.exports = router;