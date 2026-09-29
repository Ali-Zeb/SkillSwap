const mongoose = require('mongoose');
const Message = require('../models/Message');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');

// @desc    Get the conversation between the current user and another user
// @route   GET /api/messages/:userId
// @access  Private
const getConversation = asyncHandler(async (req, res) => {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const otherUser = await User.findById(userId).select('fullName avatar');
    if (!otherUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const messages = await Message.find({
        $or: [
            { senderId: currentUserId, receiverId: userId },
            { senderId: userId, receiverId: currentUserId }
        ]
    }).sort({ createdAt: 1 });

    // Mark all unread messages from the other user as read
    await Message.updateMany(
        { senderId: userId, receiverId: currentUserId, isRead: false },
        { isRead: true, readAt: Date.now() }
    );

    res.status(200).json({
        success: true,
        count: messages.length,
        messages,
        otherUser: {
            id: otherUser._id,
            fullName: otherUser.fullName,
            avatar: otherUser.avatar
        }
    });
});

// @desc    Send a message (REST fallback; primary delivery is via Socket.io)
// @route   POST /api/messages
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
    const { receiverId, content } = req.body;

    const receiver = await User.findById(receiverId);
    if (!receiver) {
        return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    const message = await Message.create({
        senderId: req.user.id,
        receiverId,
        content
    });

    res.status(201).json({ success: true, message });
});

// @desc    Get the list of conversations (most recent message per contact)
// @route   GET /api/messages
// @access  Private
const getConversationsList = asyncHandler(async (req, res) => {
    const userObjectId = new mongoose.Types.ObjectId(req.user.id);

    const conversations = await Message.aggregate([
        {
            $match: {
                $or: [{ senderId: userObjectId }, { receiverId: userObjectId }]
            }
        },
        { $sort: { createdAt: -1 } },
        {
            $group: {
                _id: {
                    $cond: [
                        { $eq: ['$senderId', userObjectId] },
                        '$receiverId',
                        '$senderId'
                    ]
                },
                lastMessage: { $first: '$$ROOT' },
                unreadCount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ['$receiverId', userObjectId] },
                                    { $eq: ['$isRead', false] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        },
        { $sort: { 'lastMessage.createdAt': -1 } }
    ]);

    const populated = (await User.populate(conversations, {
        path: '_id',
        select: 'fullName avatar headline lastActive role'
    }))
        // Deleted users (null) and admin accounts never appear as contacts.
        .filter((c) => c._id && c._id.role !== 'admin')
        .map((c) => { c._id.role = undefined; return c; });

    res.status(200).json({
        success: true,
        count: populated.length,
        conversations: populated.map((c) => ({
            user: c._id,
            lastMessage: c.lastMessage,
            unreadCount: c.unreadCount
        }))
    });
});

module.exports = { getConversation, sendMessage, getConversationsList };