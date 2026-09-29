const express = require('express')
const router  = express.Router()

const { protect }                     = require('../middleware/auth')
const { validateBody }                = require('../middleware/validate')
const { authLimiter, emailLimiter }   = require('../middleware/rateLimiter')
const { LIMITS }                      = require('../config/constants')
const { normalizeName, getFullNameError } = require('../utils/nameValidation')

const {
    registerUser,
    loginUser,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    getMe,
    logoutUser
} = require('../controllers/authController')

const emailOnly = validateBody({ email: { required: true, type: 'email' } })

router.post(
    '/register',
    authLimiter,
    validateBody({
        fullName: { required: true, type: 'string', transform: normalizeName, custom: getFullNameError },
        email:    { required: true, type: 'email' },
        password: { required: true, type: 'string', min: LIMITS.PASSWORD_MIN }
    }),
    registerUser
)

router.post(
    '/login',
    authLimiter,
    validateBody({
        email:    { required: true, type: 'email' },
        password: { required: true, type: 'string' }
    }),
    loginUser
)

// Email verification — the link in the email opens the frontend, which
// calls either form with the token.
router.get('/verify-email/:token', authLimiter, verifyEmail)
router.post(
    '/verify-email',
    authLimiter,
    validateBody({ token: { required: true, type: 'string' } }),
    verifyEmail
)
router.post('/resend-verification', emailLimiter, emailOnly, resendVerification)

// Password reset
router.post('/forgot-password', emailLimiter, emailOnly, forgotPassword)
router.post(
    '/reset-password/:token',
    authLimiter,
    validateBody({
        password: { required: true, type: 'string', min: LIMITS.PASSWORD_MIN }
    }),
    resetPassword
)

router.get('/me',     protect, getMe)
router.post('/logout', protect, logoutUser)

module.exports = router
