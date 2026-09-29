const express = require('express');
const router  = express.Router();

const { protect } = require('../middleware/auth');
const { getBadgeMeta, getUserBadges } = require('../controllers/badgeController');

router.get('/meta',         protect, getBadgeMeta);
router.get('/user/:userId', protect, getUserBadges);

module.exports = router;
