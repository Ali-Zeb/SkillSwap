const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { LIMITS, SKILL_CATEGORIES } = require('../config/constants');

const { getAllSkills, getSkillById, createSkill } = require('../controllers/skillController');

router.get('/', protect, getAllSkills);
router.get('/:id', protect, getSkillById);

router.post(
    '/',
    protect,
    validateBody({
        name: { required: true, type: 'string', min: 2, max: LIMITS.SKILL_NAME_MAX },
        category: { required: true, type: 'string', enum: SKILL_CATEGORIES },
        description: { type: 'string', max: LIMITS.SKILL_DESCRIPTION_MAX }
    }),
    createSkill
);

module.exports = router;