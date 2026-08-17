const Message      = require('../models/Message');
const asyncHandler = require('../utils/asyncHandler');
const path         = require('path');

// Allowed file extensions for security
const ALLOWED_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.ppt', '.pptx', '.txt', '.zip',
]);

// @desc    Send a file message in session chat
// @route   POST /api/messages/file
// @access  Private
const sendFileMessage = asyncHandler(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { receiverId } = req.body;
    if (!receiverId) {
        return res.status(400).json({ success: false, message: 'receiverId is required' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        return res.status(400).json({
            success: false,
            message: 'File type not allowed. Supported: images, PDF, Word, Excel, PowerPoint, TXT, ZIP'
        });
    }

    const message = await Message.create({
        senderId:   req.user.id,
        receiverId,
        content:    null,
        fileUrl:    '/uploads/' + req.file.filename,
        fileName:   req.file.originalname,
        fileType:   req.file.mimetype,
        fileSize:   req.file.size,
    });

    await message.populate('senderId', 'fullName avatar');

    res.status(201).json({
        success: true,
        message: message,
    });
});

module.exports = { sendFileMessage };
