const asyncHandler = require('../utils/asyncHandler');
const Notification  = require('../models/Notification');

// ---------------------------------------------------------------------------
// @desc    Get notifications for the authenticated user
// @route   GET /api/notifications
// @access  Private
// @query   ?unread=true   filter to unread only
// @query   ?limit=20      results per page (default 20, max 50)
// @query   ?page=1        page number (default 1)
// ---------------------------------------------------------------------------
const getNotifications = asyncHandler(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 50);
    const page  = Math.max(parseInt(req.query.page,  10) || 1,  1);
    const skip  = (page - 1) * limit;

    const filter = { userId: req.user._id, deleted: false };
    if (req.query.unread === 'true') {
        filter.read = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
        Notification.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        Notification.countDocuments(filter),
        Notification.countDocuments({ userId: req.user._id, read: false, deleted: false })
    ]);

    res.status(200).json({
        success:     true,
        count:       notifications.length,
        unreadCount,
        total,
        page,
        pages:       Math.ceil(total / limit),
        notifications
    });
});

// ---------------------------------------------------------------------------
// @desc    Get unread notification count (used by navbar bell badge)
// @route   GET /api/notifications/unread-count
// @access  Private
// ---------------------------------------------------------------------------
const getUnreadCount = asyncHandler(async (req, res) => {
    const count = await Notification.countDocuments({
        userId:  req.user._id,
        read:    false,
        deleted: false
    });

    res.status(200).json({
        success: true,
        count
    });
});

// ---------------------------------------------------------------------------
// @desc    Mark a single notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
// ---------------------------------------------------------------------------
const markAsRead = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id, deleted: false },
        { read: true },
        { new: true }
    );

    if (!notification) {
        return res.status(404).json({
            success: false,
            message: 'Notification not found'
        });
    }

    res.status(200).json({
        success:      true,
        message:      'Notification marked as read',
        notification
    });
});

// ---------------------------------------------------------------------------
// @desc    Mark all unread notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
// ---------------------------------------------------------------------------
const markAllAsRead = asyncHandler(async (req, res) => {
    const result = await Notification.updateMany(
        { userId: req.user._id, read: false, deleted: false },
        { read: true }
    );

    res.status(200).json({
        success: true,
        message: `${result.modifiedCount} notification${result.modifiedCount !== 1 ? 's' : ''} marked as read`,
        count:   result.modifiedCount
    });
});

// ---------------------------------------------------------------------------
// @desc    Soft-delete a single notification
// @route   DELETE /api/notifications/:id
// @access  Private
// ---------------------------------------------------------------------------
const deleteNotification = asyncHandler(async (req, res) => {
    const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.user._id },
        { deleted: true },
        { new: true }
    );

    if (!notification) {
        return res.status(404).json({
            success: false,
            message: 'Notification not found'
        });
    }

    res.status(200).json({
        success: true,
        message: 'Notification removed'
    });
});

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification
};