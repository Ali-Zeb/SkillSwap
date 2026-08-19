const Message      = require('../models/Message');
const User         = require('../models/User');
const cloudinary   = require('../config/cloudinary');
const asyncHandler = require('../utils/asyncHandler');
const path         = require('path');

// Secondary, extension-based check — defense in depth on top of the
// mimetype allowlist already enforced by the Multer fileFilter in
// middleware/upload.js (uploadChatFile). Keep these two lists in sync.
const ALLOWED_EXTENSIONS = new Set([
    '.jpg', '.jpeg', '.png', '.gif', '.webp',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx',
    '.ppt', '.pptx', '.txt',
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

    const receiver = await User.findById(receiverId);
    if (!receiver) {
        // CloudinaryStorage uploads during the Multer step, before this
        // controller ever runs, so the file is already on Cloudinary by the
        // time we learn receiverId is invalid. Clean it up so a bad
        // receiverId doesn't leave an orphaned asset behind.
        const resourceType = req.file.mimetype.startsWith('image/') ? 'image' : 'raw';
        cloudinary.uploader.destroy(req.file.filename, { resource_type: resourceType })
            .catch((err) => console.error('Failed to clean up orphaned Cloudinary upload:', err.message));
        return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
        return res.status(400).json({
            success: false,
            message: 'File type not allowed. Supported: images, PDF, Word, Excel, PowerPoint, TXT'
        });
    }

    const message = await Message.create({
        senderId:         req.user.id,
        receiverId,
        content:          null,
        // req.file.path is the Cloudinary secure_url (set by CloudinaryStorage
        // in middleware/upload.js) — not a local disk path.
        fileUrl:          req.file.path,
        fileName:         req.file.originalname,
        fileType:         req.file.mimetype,
        fileSize:         req.file.size,
        fileResourceType: req.file.mimetype.startsWith('image/') ? 'image' : 'raw',
    });

    await message.populate('senderId', 'fullName avatar');

    // Unlike text messages — which are primarily delivered over the
    // 'send-message' socket event, with this REST endpoint acting only as a
    // fallback (see messageController.js) — file uploads have no socket
    // delivery path at all, since Multer needs an HTTP multipart request.
    // Broadcast it the same way socket/index.js's 'send-message' handler
    // broadcasts text messages, so the recipient sees the real attachment
    // immediately instead of the old placeholder-text workaround.
    const io = req.app.get('io');
    io.to('user_' + receiverId).emit('new-message', message);
    io.to('user_' + req.user.id).emit('new-message', message);

    res.status(201).json({
        success: true,
        message: message,
    });
});

module.exports = { sendFileMessage };
