const multer = require('multer');
const path = require('path');
const { Readable } = require('stream');
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

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

/**
 * Wraps a Multer storage engine so the upload is fully buffered and its
 * magic bytes checked against an allowlist before being handed to the real
 * storage engine — the declared Content-Type and filename extension are
 * both client-supplied and easily spoofed, so this is the real check.
 *
 * This can't live in `fileFilter` (an earlier version tried that and broke
 * every upload): Multer only attaches `file.stream` to the file object
 * *after* fileFilter approves it — see node_modules/multer/lib/
 * make-middleware.js, where the object passed into fileFilter is built
 * from just fieldname/originalname/encoding/mimetype, with `.stream`
 * defined only inside fileFilter's own callback. fileFilter therefore can
 * only ever see metadata, never content. This wrapper's _handleFile is the
 * first point in the pipeline that actually has bytes to inspect.
 *
 * `unsniffableMimeTypes` (plain text, legacy binary Office formats) have no
 * reliable magic-byte signature — file-type can't tell them apart or can't
 * detect them at all — so those are let through on the declared mimetype
 * alone (already checked by the cheap fileFilter ahead of this).
 */
class VerifyingStorage {
    constructor({ storage: innerStorage, sniffableMimeTypes, unsniffableMimeTypes = new Set(), rejectMessage }) {
        this.storage = innerStorage;
        this.sniffableMimeTypes = sniffableMimeTypes;
        this.unsniffableMimeTypes = unsniffableMimeTypes;
        this.rejectMessage = rejectMessage;
    }

    async _handleFile(req, file, cb) {
        try {
            const chunks = [];
            for await (const chunk of file.stream) chunks.push(chunk);
            const buffer = Buffer.concat(chunks);

            if (!this.unsniffableMimeTypes.has(file.mimetype)) {
                const { fileTypeFromBuffer } = await import('file-type');
                const detected = await fileTypeFromBuffer(buffer);
                if (!detected || !this.sniffableMimeTypes.has(detected.mime)) {
                    return cb(new Error(this.rejectMessage));
                }
            }

            // Give the real storage engine a fresh stream over the buffered
            // bytes — the original stream has already been fully consumed
            // above.
            this.storage._handleFile(req, { ...file, stream: Readable.from(buffer) }, cb);
        } catch (err) {
            cb(err);
        }
    }

    _removeFile(req, file, cb) {
        this.storage._removeFile(req, file, cb);
    }
}

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only JPEG, PNG, WEBP, and GIF images are allowed'), false);
    }
};

const upload = multer({
    storage: new VerifyingStorage({
        storage,
        sniffableMimeTypes: ALLOWED_MIME_TYPES,
        rejectMessage: 'Only JPEG, PNG, WEBP, and GIF images are allowed',
    }),
    fileFilter,
    limits: {
        fileSize: LIMITS.AVATAR_FILE_SIZE_MB * 1024 * 1024
    }
});

// Chat/session file attachments — same Cloudinary-backed pattern as avatars
// above, so attachments survive Render's ephemeral disk instead of 404ing
// after the next redeploy. Images are stored as Cloudinary "image" resources;
// everything else (PDF/Office/txt) as "raw" so Cloudinary doesn't try to
// transcode them. The original extension is kept in the public_id for raw
// files since Cloudinary doesn't infer one for that resource type.
const CHAT_SNIFFABLE_MIME_TYPES = new Set([
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]);

// file-type can't produce a useful signature for these: legacy binary
// Office formats (.doc/.xls/.ppt) all share one indistinguishable
// container signature, and plain text has no signature at all.
const CHAT_UNSNIFFABLE_MIME_TYPES = new Set([
    'text/plain',
    'application/msword',
    'application/vnd.ms-excel',
    'application/vnd.ms-powerpoint',
]);

const CHAT_ALLOWED_MIME_TYPES = new Set([...CHAT_SNIFFABLE_MIME_TYPES, ...CHAT_UNSNIFFABLE_MIME_TYPES]);

const chatFileStorage = new CloudinaryStorage({
    cloudinary,
    params: (req, file) => {
        const isImage = file.mimetype.startsWith('image/');
        const base = `${req.user ? req.user.id : 'anon'}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        return {
            folder: 'skillswap/chat-files',
            resource_type: isImage ? 'image' : 'raw',
            public_id: isImage ? base : `${base}${path.extname(file.originalname)}`,
        };
    },
});

const chatFileFilter = (req, file, cb) => {
    if (CHAT_ALLOWED_MIME_TYPES.has(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('File type not allowed'), false);
    }
};

const uploadChatFile = multer({
    storage: new VerifyingStorage({
        storage: chatFileStorage,
        sniffableMimeTypes: CHAT_SNIFFABLE_MIME_TYPES,
        unsniffableMimeTypes: CHAT_UNSNIFFABLE_MIME_TYPES,
        rejectMessage: 'File type not allowed',
    }),
    fileFilter: chatFileFilter,
    limits: {
        fileSize: LIMITS.CHAT_FILE_SIZE_MB * 1024 * 1024
    }
});

const handleUploadError = (uploadMiddleware, maxSizeMB = LIMITS.AVATAR_FILE_SIZE_MB) => {
    return (req, res, next) => {
        uploadMiddleware(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: `File too large. Maximum size is ${maxSizeMB}MB`
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

module.exports = { upload, handleUploadError, uploadChatFile };
