const { LIMITS, NAME_REGEX } = require('../config/constants');

/**
 * Canonical form of a full name: Unicode NFC, trimmed, and every run of
 * whitespace collapsed to a single space. Non-strings pass through
 * unchanged so validateBody's type check can report them.
 */
const normalizeName = (value) => {
    if (typeof value !== 'string') return value;
    return value.normalize('NFC').trim().replace(/\s+/g, ' ');
};

/**
 * Returns a user-facing error message for an (already normalized) full
 * name, or null when it is valid. Checks run from most to least specific
 * so the user sees the most helpful message first.
 */
const getFullNameError = (name) => {
    if (typeof name !== 'string' || name === '') {
        return 'Full name is required';
    }
    if (name.length < LIMITS.FULL_NAME_MIN) {
        return `Full name must be at least ${LIMITS.FULL_NAME_MIN} characters`;
    }
    if (name.length > LIMITS.FULL_NAME_MAX) {
        return `Full name cannot exceed ${LIMITS.FULL_NAME_MAX} characters`;
    }
    if (/[0-9٠-٩۰-۹]/.test(name)) {
        return 'Full name cannot contain numbers';
    }
    if (!NAME_REGEX.test(name)) {
        return "Full name can only contain letters and single spaces, with . ' or - only between letters";
    }
    return null;
};

module.exports = { normalizeName, getFullNameError };
