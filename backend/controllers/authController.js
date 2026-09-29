const User           = require('../models/User');
const generateToken  = require('../utils/generateToken');
const asyncHandler   = require('../utils/asyncHandler');
const emailService   = require('../services/emailService');
const emailTemplates = require('../utils/emailTemplates');
const { createToken, hashToken, isWellFormedToken, clientUrl } = require('../utils/authTokens');
const { AUTH_TOKEN_TTL, isDisposableEmail } = require('../config/constants');

/**
 * Issues a fresh verification token for `user` (saving its hash) and
 * emails the link. Returns true when the email was handed to the provider.
 */
const sendVerificationEmail = async (user) => {
    const { token, hash, expires } = createToken(AUTH_TOKEN_TTL.EMAIL_VERIFICATION_MS);
    user.emailVerificationToken   = hash;
    user.emailVerificationExpires = expires;
    await user.save({ validateModifiedOnly: true });

    try {
        await emailService.sendEmail({
            to: { email: user.email, name: user.fullName },
            ...emailTemplates.verifyEmail({ name: user.fullName, url: `${clientUrl()}/verify-email/${token}` })
        });
        return true;
    } catch (error) {
        console.error('Verification email failed:', error.message);
        return false;
    }
};

// @desc    Register a new user (must verify their email before logging in)
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, password } = req.body;
    const normalizedEmail = email.toLowerCase().trim();

    if (isDisposableEmail(normalizedEmail)) {
        return res.status(400).json({
            success: false,
            message: 'Disposable email addresses are not allowed. Please use your real email.'
        });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
        return res.status(400).json({
            success: false,
            message: 'An account with this email already exists'
        });
    }

    const user = await User.create({ fullName, email: normalizedEmail, password, isEmailVerified: false });
    const emailSent = await sendVerificationEmail(user);

    // No JWT is issued until the email is verified.
    res.status(201).json({
        success: true,
        requiresVerification: true,
        emailSent,
        email: user.email,
        message: emailSent
            ? 'Account created. Check your inbox to verify your email.'
            : 'Account created, but we could not send the verification email. Please use "Resend email".'
    });
});

// @desc    Log in an existing user
// @route   POST /api/auth/login
// @access  Public
const loginUser = asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
        });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
        });
    }

    // Checked after the password so account status isn't revealed to
    // someone who doesn't know the password.
    if (!user.isActive) {
        return res.status(403).json({
            success: false,
            code:    'ACCOUNT_DEACTIVATED',
            message: user.deactivationReason
                ? `Your account has been deactivated. Reason: ${user.deactivationReason}`
                : 'Your account has been deactivated. Please contact support.'
        });
    }

    // Only an explicit `false` blocks: accounts created before email
    // verification existed have no value and keep logging in.
    if (user.isEmailVerified === false) {
        return res.status(403).json({
            success: false,
            code:    'EMAIL_NOT_VERIFIED',
            email:   user.email,
            message: 'Please verify your email before logging in. Check your inbox for the link.'
        });
    }

    const token = generateToken(user._id);

    res.status(200).json({
        success: true,
        message: 'Logged in successfully',
        token,
        user
    });
});

// @desc    Verify an email address from the emailed link; logs the user in
// @route   GET /api/auth/verify-email/:token  and  POST /api/auth/verify-email { token }
// @access  Public
const verifyEmail = asyncHandler(async (req, res) => {
    const token = req.params.token || req.body.token;
    const invalid = () => res.status(400).json({
        success: false,
        code:    'TOKEN_INVALID',
        message: 'This verification link is invalid or has expired. Request a new one.'
    });

    if (!isWellFormedToken(token)) return invalid();

    const user = await User.findOne({
        emailVerificationToken:   hashToken(token),
        emailVerificationExpires: { $gt: new Date() }
    });
    if (!user) return invalid();

    user.isEmailVerified          = true;
    user.emailVerificationToken   = undefined;
    user.emailVerificationExpires = undefined;
    await user.save({ validateModifiedOnly: true });

    if (!user.isActive) {
        return res.status(200).json({ success: true, message: 'Email verified. Your account is currently deactivated.' });
    }

    res.status(200).json({
        success: true,
        message: 'Email verified. Welcome to SkillSwap!',
        token:   generateToken(user._id),
        user
    });
});

// @desc    Send a new verification link (same response whether or not the email exists)
// @route   POST /api/auth/resend-verification { email }
// @access  Public (rate-limited)
const resendVerification = asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase().trim();
    const user  = await User.findOne({ email });

    if (user && user.isEmailVerified === false && user.isActive) {
        await sendVerificationEmail(user);
    }

    res.status(200).json({
        success: true,
        message: 'If that account still needs verification, a new link is on its way. Check your inbox and spam folder.'
    });
});

// @desc    Email a password reset link (same response whether or not the email exists)
// @route   POST /api/auth/forgot-password { email }
// @access  Public (rate-limited)
const forgotPassword = asyncHandler(async (req, res) => {
    const email = req.body.email.toLowerCase().trim();
    const user  = await User.findOne({ email });

    if (user && user.isActive) {
        const { token, hash, expires } = createToken(AUTH_TOKEN_TTL.PASSWORD_RESET_MS);
        user.passwordResetToken   = hash;
        user.passwordResetExpires = expires;
        await user.save({ validateModifiedOnly: true });

        try {
            await emailService.sendEmail({
                to: { email: user.email, name: user.fullName },
                ...emailTemplates.passwordReset({ name: user.fullName, url: `${clientUrl()}/reset-password/${token}` })
            });
        } catch (error) {
            // Logged only — the response must not reveal whether the account exists.
            console.error('Password reset email failed:', error.message);
        }
    }

    res.status(200).json({
        success: true,
        message: 'If an account exists for that email, a password reset link has been sent. It expires in 15 minutes.'
    });
});

// @desc    Set a new password using a reset link; signs out all existing sessions
// @route   POST /api/auth/reset-password/:token { password }
// @access  Public (rate-limited)
const resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params;
    const invalid = () => res.status(400).json({
        success: false,
        code:    'TOKEN_INVALID',
        message: 'This reset link is invalid or has expired. Request a new one.'
    });

    if (!isWellFormedToken(token)) return invalid();

    const user = await User.findOne({
        passwordResetToken:   hashToken(token),
        passwordResetExpires: { $gt: new Date() }
    });
    if (!user) return invalid();

    user.password             = req.body.password;   // hashed by the pre-save hook
    user.passwordResetToken   = undefined;           // single use
    user.passwordResetExpires = undefined;
    // 1s back-dated: JWT `iat` has second precision, so a login right after
    // the reset must not be treated as "issued before the change".
    user.passwordChangedAt    = new Date(Date.now() - 1000);
    // Receiving the reset link proves the user owns the inbox.
    if (user.isEmailVerified === false) user.isEmailVerified = true;
    await user.save({ validateModifiedOnly: true });

    // Existing sockets were authenticated with now-revoked tokens.
    const io = req.app.get('io');
    if (io) io.in(`user_${user._id}`).disconnectSockets(true);

    emailService
        .sendEmail({
            to: { email: user.email, name: user.fullName },
            ...emailTemplates.passwordChanged({ name: user.fullName, loginUrl: `${clientUrl()}/login` })
        })
        .catch((error) => console.error('Password changed email failed:', error.message));

    res.status(200).json({
        success: true,
        message: 'Your password has been reset. Please log in with your new password.'
    });
});

// @desc    Get the currently authenticated user
// @route   GET /api/auth/me
// @access  Private
const getMe = asyncHandler(async (req, res) => {
    // req.user is already attached and password-stripped by the protect middleware
    res.status(200).json({
        success: true,
        user: req.user
    });
});

// @desc    Log out the current user
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = asyncHandler(async (req, res) => {
    // JWT is stateless and stored client-side, so logout is a client-side
    // token removal. This endpoint exists for a consistent API contract
    // and as a hook point if a token blocklist is added later.
    res.status(200).json({
        success: true,
        message: 'Logged out successfully'
    });
});

module.exports = {
    registerUser,
    loginUser,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    getMe,
    logoutUser
};
