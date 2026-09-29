const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { LIMITS, SKILL_TYPES, DAYS_OF_WEEK, BADGE_TYPES } = require('../config/constants');

const userSkillSchema = new mongoose.Schema({
    skillId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Skill',
        required: true
    },
    type: {
        type: String,
        enum: SKILL_TYPES,
        required: true
    },
    proficiency: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        default: 'intermediate'
    }
}, { _id: false });

const availabilitySchema = new mongoose.Schema({
    day: {
        type: String,
        enum: DAYS_OF_WEEK,
        required: true
    },
    startTime: { type: String, required: true }, // "HH:MM" 24hr format
    endTime: { type: String, required: true }
}, { _id: false });

/**
 * Stores only the persistent badge data.
 * Presentation fields (label, icon) are kept in BADGE_META in constants.js
 * so they can be updated without a database migration.
 */
const badgeSchema = new mongoose.Schema({
    type: {
        type:     String,
        enum:     Object.values(BADGE_TYPES),
        required: true
    },
    earnedAt: {
        type:    Date,
        default: Date.now
    }
}, { _id: false });

const UserSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: [true, 'Full name is required'],
        trim: true,
        maxlength: [LIMITS.FULL_NAME_MAX, `Full name cannot exceed ${LIMITS.FULL_NAME_MAX} characters`]
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [LIMITS.PASSWORD_MIN, `Password must be at least ${LIMITS.PASSWORD_MIN} characters`],
        select: false
    },
    avatar: {
        type: String,
        default: ''
    },
    headline: {
        type: String,
        maxlength: [LIMITS.HEADLINE_MAX, `Headline cannot exceed ${LIMITS.HEADLINE_MAX} characters`],
        default: ''
    },
    about: {
        type: String,
        maxlength: [LIMITS.ABOUT_MAX, `About cannot exceed ${LIMITS.ABOUT_MAX} characters`],
        default: ''
    },
    location: {
        type: String,
        default: ''
    },
    skills: [userSkillSchema],
    availability: [availabilitySchema],
    reputation: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    /**
     * Earned badges. Only { type, earnedAt } is stored — presentation data
     * lives in BADGE_META in constants.js.
     */
    badges: {
        type:    [badgeSchema],
        default: []
    },
    /**
     * Cached profile completion score (0–100). Recomputed and persisted
     * by userMetricsService whenever the user updates their profile.
     * Existing users default to 0 until their next profile mutation.
     */
    profileCompletion: {
        type:    Number,
        default: 0,
        min:     0,
        max:     100
    },
    /**
     * Fraction of incoming connection requests responded to within 24 hours.
     * Range 0.0–1.0. Unanswered requests count against this rate.
     * Recomputed by userMetricsService after every accept or decline.
     * Existing users default to 0 until their next response action.
     */
    responseRate: {
        type:    Number,
        default: 0,
        min:     0,
        max:     1
    },
    role: {
        type: String,
        enum: ['user', 'admin'],
        default: 'user'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    /**
     * Set by an admin when deactivating (suspending) the account; shown to
     * the user on login. Cleared on reactivation. Existing users default
     * to empty/null, so no migration is needed.
     */
    deactivationReason: {
        type:      String,
        trim:      true,
        maxlength: 500,
        default:   ''
    },
    deactivatedAt: {
        type:    Date,
        default: null
    },
    /**
     * Email verification. Deliberately has NO schema default: Mongoose
     * applies defaults when loading old documents, which would mark every
     * existing user unverified and lock them out. registerUser sets it to
     * false explicitly; only an explicit `false` blocks login, and
     * scripts/markUsersVerified.js backfills `true` for existing users.
     */
    isEmailVerified: {
        type: Boolean
    },
    emailVerificationToken:   { type: String, select: false },   // SHA-256 hash
    emailVerificationExpires: { type: Date,   select: false },
    passwordResetToken:       { type: String, select: false },   // SHA-256 hash
    passwordResetExpires:     { type: Date,   select: false },
    /**
     * Set when the password is reset; `protect` rejects JWTs issued before
     * it, which signs the user out everywhere.
     */
    passwordChangedAt: {
        type:    Date,
        default: null
    },
    lastActive: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

// Hash the password before saving, only when it has changed.
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compares a plaintext candidate password against the stored hash.
// Requires the query that loaded this user to have used .select('+password').
UserSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Strip sensitive/internal fields whenever a user document is serialized to JSON.
UserSchema.methods.toJSON = function () {
    const obj = this.toObject();
    delete obj.password;
    delete obj.__v;
    delete obj.emailVerificationToken;
    delete obj.emailVerificationExpires;
    delete obj.passwordResetToken;
    delete obj.passwordResetExpires;
    delete obj.passwordChangedAt;
    return obj;
};

module.exports = mongoose.model('User', UserSchema);