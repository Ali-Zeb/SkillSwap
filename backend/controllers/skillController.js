const Skill = require('../models/Skill');
const asyncHandler = require('../utils/asyncHandler');

// Normalize a skill name: trim whitespace and convert to Title Case.
// "REACT", "react", "  react  " all become "React".
// "web development" becomes "Web Development".
const normalizeSkillName = (name) => {
    return name
        .trim()
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

// @desc    Get all skills, optionally filtered by category or search term
// @route   GET /api/skills
// @access  Private
const getAllSkills = asyncHandler(async (req, res) => {
    const { category, search } = req.query;
    const query = {};

    if (category) {
        query.category = category;
    }

    if (search) {
        query.name = { $regex: search, $options: 'i' };
    }

    const skills = await Skill.find(query).sort({ name: 1 });

    res.status(200).json({
        success: true,
        count: skills.length,
        skills
    });
});

// @desc    Get a single skill by id
// @route   GET /api/skills/:id
// @access  Private
const getSkillById = asyncHandler(async (req, res) => {
    const skill = await Skill.findById(req.params.id);

    if (!skill) {
        return res.status(404).json({ success: false, message: 'Skill not found' });
    }

    res.status(200).json({ success: true, skill });
});

// @desc    Create a skill or return existing one (case-insensitive dedup)
// @route   POST /api/skills
// @access  Private
const createSkill = asyncHandler(async (req, res) => {
    const { category, description, icon } = req.body;

    // Normalize before any DB operation so "react", "REACT", "React"
    // all resolve to the same catalog entry "React".
    const name = normalizeSkillName(req.body.name || '');

    if (!name) {
        return res.status(400).json({
            success: false,
            message: 'Skill name is required'
        });
    }

    // Case-insensitive lookup using the collation index defined on Skill.js
    const existing = await Skill.findOne({ name }).collation({
        locale: 'en',
        strength: 2
    });

    if (existing) {
        // Return the existing skill so the frontend can use its _id
        // to attach it to the user's profile — no duplicate created
        return res.status(200).json({
            success: true,
            message: 'Skill already exists in catalog',
            skill: existing
        });
    }

    const skill = await Skill.create({
        name,
        category: category || 'Other',
        description: description || '',
        icon: icon || ''
    });

    res.status(201).json({
        success: true,
        message: 'Skill added to catalog',
        skill
    });
});

module.exports = { getAllSkills, getSkillById, createSkill };