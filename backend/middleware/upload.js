const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const { LIMITS } = require('../config/constants');

// Images now go straight to Cloudinary instead of local disk. Render's
// free-tier disk is ephemeral (wiped on every restart/redeploy), so
// storing uploads locally meant avatars silently disappeared after any
// redeploy. Cloudinary storage persists independently of the server.
const storage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => ({
        folder: 'skillswap/avatars',
        public_id: `${req.user ? req.user.id : 'anon'}-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        transformation: [{ width: 512, height: 512, crop: 'limit' }],
    }),
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