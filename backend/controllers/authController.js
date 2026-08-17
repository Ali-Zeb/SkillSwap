const User = require('../models/User');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
        return res.status(400).json({
            success: false,
            message: 'An account with this email already exists'
        });
    }

    const user = await User.create({ fullName, email, password });
    const token = generateToken(user._id);

    res.status(201).json({
        success: true,
        message: 'Account created successfully',
        token,
        user
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

    if (!user.isActive) {
        return res.status(401).json({
            success: false,
            message: 'This account has been deactivated'
        });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
        return res.status(401).json({
            success: false,
            message: 'Invalid email or password'
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

module.exports = { registerUser, loginUser, getMe, logoutUser };