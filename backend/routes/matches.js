const express = require('express');
const router = express.Router();

const { protect } = require('../middleware/auth');
const { getPotentialMatches, getMatchDetails } = require('../controllers/matchController');

router.get('/', protect, getPotentialMatches);
router.get('/:matchId', protect, getMatchDetails);

module.exports = router;