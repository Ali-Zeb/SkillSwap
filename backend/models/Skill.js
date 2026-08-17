const mongoose = require('mongoose');
const { LIMITS, SKILL_CATEGORIES } = require('../config/constants');

const SkillSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Skill name is required'],
        trim: true,
        maxlength: [LIMITS.SKILL_NAME_MAX, `Skill name cannot exceed ${LIMITS.SKILL_NAME_MAX} characters`]
    },
    category: {
        type: String,
        enum: SKILL_CATEGORIES,
        required: [true, 'Skill category is required']
    },
    description: {
        type: String,
        maxlength: [LIMITS.SKILL_DESCRIPTION_MAX, `Description cannot exceed ${LIMITS.SKILL_DESCRIPTION_MAX} characters`],
        default: ''
    },
    icon: {
        type: String,
        default: ''
    }
}, {
    timestamps: true
});

// Case-insensitive unique index — this alone enforces uniqueness,
// so `unique: true` is intentionally removed from the field definition
// above to avoid the duplicate index warning.
SkillSchema.index(
    { name: 1 },
    { unique: true, collation: { locale: 'en', strength: 2 } }
);

module.exports = mongoose.model('Skill', SkillSchema);