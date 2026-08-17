const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { LIMITS } = require('../config/constants');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');

// Ensure the uploads directory exists at startup so Multer never fails
// with an obscure ENOENT error on the first request.
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Sanitize: strip the original name entirely and build a safe,
        // collision-resistant filename instead of trusting user input.
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${req.user ? req.user.id : 'anon'}-${uniqueSuffix}${ext}`);
    }
});

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, WEBP, and GIF images are allowed'), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: LIMITS.AVATAR_FILE_SIZE_MB * 1024 * 1024
    }
});

/**
 * Wraps a Multer middleware so its errors (file too large, wrong type,
 * etc.) return a clean JSON 400 instead of crashing past Multer's own
 * error format into the generic error handler.
 */
const handleUploadError = (uploadMiddleware) => {
    return (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: `File too large. Maximum size is ${LIMITS.AVATAR_FILE_SIZE_MB}MB`
                    });
                }
                return res.status(400).json({ success: false, message: err.message });
            }
            if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            next();
        });
    };
};

module.exports = { upload, handleUploadError };