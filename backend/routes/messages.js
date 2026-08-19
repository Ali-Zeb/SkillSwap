const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateBody } = require('../middleware/validate');
const { uploadChatFile, handleUploadError } = require('../middleware/upload');
const { LIMITS } = require('../config/constants');

const { getConversation, sendMessage, getConversationsList } = require('../controllers/messageController');
const { sendFileMessage } = require('../controllers/messageFileController');

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

router.post(
    '/file',
    protect,
    handleUploadError(uploadChatFile.single('file'), LIMITS.CHAT_FILE_SIZE_MB),
    sendFileMessage
);

module.exports = router;