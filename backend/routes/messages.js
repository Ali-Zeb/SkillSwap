const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { LIMITS } = require('../config/constants');

const { getConversation, sendMessage, getConversationsList } = require('../controllers/messageController');

router.get('/', protect, getConversationsList);

router.post(
    '/',
    protect,
    validateBody({
        receiverId: { required: true, type: 'string' },
        content: { required: true, type: 'string', min: 1, max: LIMITS.MESSAGE_CONTENT_MAX }
    }),
    sendMessage
);

router.get('/:userId', protect, getConversation);

module.exports = router;

const multer              = require('multer');
const path                = require('path');
const { sendFileMessage } = require('../controllers/messageFileController');

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename:    (req, file, cb) => {
        cb(null, 'chat-' + Date.now() + '-' + Math.round(Math.random()*1e9) + path.extname(file.originalname))
    }
});
const uploadFile = multer({ storage, limits: { fileSize: 10*1024*1024 } });

router.post('/file', protect, uploadFile.single('file'), sendFileMessage);