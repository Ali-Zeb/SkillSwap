/**
 * Lightweight, dependency-free request validation.
 *
 * Usage in a route file:
 *   const { validateBody } = require('../middleware/validate');
 *   router.post('/', validateBody({
 *       email: { required: true, type: 'email' },
 *       password: { required: true, type: 'string', min: 8 }
 *   }), registerUser);
 *
 * Supported rule keys per field:
 *   required: boolean
 *   type: 'string' | 'email' | 'number' | 'boolean' | 'array'
 *   min: minimum length (string/array) or value (number)
 *   max: maximum length (string/array) or value (number)
 *   enum: array of allowed values
 *   transform: (value) => newValue — applied first and written back to req.body
 *   custom: (value) => string|null — returns an error message, or null if valid
 */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateField = (key, value, rules) => {
    const errors = [];

    const isEmpty = value === undefined || value === null || value === '';

    if (rules.required && isEmpty) {
        errors.push(`${key} is required`);
        return errors; // no point checking further rules on a missing field
    }

    if (isEmpty) {
        return errors; // optional and not provided, nothing more to check
    }

    if (rules.type === 'email' && !EMAIL_REGEX.test(value)) {
        errors.push(`${key} must be a valid email address`);
    }

    if (rules.type === 'number' && typeof value !== 'number') {
        errors.push(`${key} must be a number`);
    }

    if (rules.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`${key} must be a boolean`);
    }

    if (rules.type === 'array' && !Array.isArray(value)) {
        errors.push(`${key} must be an array`);
    }

    if ((rules.type === 'string' || rules.type === 'email') && typeof value === 'string') {
        if (rules.min !== undefined && value.length < rules.min) {
            errors.push(`${key} must be at least ${rules.min} characters`);
        }
        if (rules.max !== undefined && value.length > rules.max) {
            errors.push(`${key} cannot exceed ${rules.max} characters`);
        }
    }

    if (rules.type === 'number' && typeof value === 'number') {
        if (rules.min !== undefined && value < rules.min) {
            errors.push(`${key} must be at least ${rules.min}`);
        }
        if (rules.max !== undefined && value > rules.max) {
            errors.push(`${key} cannot exceed ${rules.max}`);
        }
    }

    if (rules.enum && !rules.enum.includes(value)) {
        errors.push(`${key} must be one of: ${rules.enum.join(', ')}`);
    }

    if (rules.custom && errors.length === 0) {
        const customError = rules.custom(value);
        if (customError) errors.push(customError);
    }

    return errors;
};

/**
 * Returns an Express middleware that validates req.body against the
 * given schema object and responds with 400 + a list of messages if
 * anything fails, before the request ever reaches the controller.
 */
const validateBody = (schema) => {
    return (req, res, next) => {
        const allErrors = [];

        for (const [key, rules] of Object.entries(schema)) {
            if (rules.transform && req.body[key] !== undefined) {
                req.body[key] = rules.transform(req.body[key]);
            }
            const fieldErrors = validateField(key, req.body[key], rules);
            allErrors.push(...fieldErrors);
        }

        if (allErrors.length > 0) {
            return res.status(400).json({
                success: false,
                // Joined so clients that only show `message` still get the specifics.
                message: allErrors.join('. '),
                errors: allErrors
            });
        }

        next();
    };
};

module.exports = { validateBody };