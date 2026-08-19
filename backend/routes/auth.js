const express = require('express')
const router  = express.Router()

const { protect }       = require('../middleware/auth')
const { validateBody }  = require('../middleware/validate')
const { authLimiter }   = require('../middleware/rateLimiter')
const { LIMITS }        = require('../config/constants')

const { registerUser, loginUser, getMe, logoutUser } = require('../controllers/authController')

router.post(
    '/register',
    authLimiter,
    validateBody({
        fullName: { required: true, type: 'string', min: 2, max: LIMITS.FULL_NAME_MAX },
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

router.get('/me',     protect, getMe)
router.post('/logout', protect, logoutUser)

module.exports = router