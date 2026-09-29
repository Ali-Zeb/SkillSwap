const mongoose            = require('mongoose');
const Report              = require('../models/Report');
const User                = require('../models/User');
const Session             = require('../models/Session');
const Message             = require('../models/Message');
const asyncHandler        = require('../utils/asyncHandler');
const notificationService = require('../services/notificationService');
const { REPORT_REASONS, REPORT_STATUS } = require('../config/constants');

const getIo = (req) => req.app.get('io') || null;

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id) && String(new mongoose.Types.ObjectId(id)) === String(id);

/**
 * Confirms that the reported session/message exists and actually involves
 * both the reporter and the reported user. Returns an error message, or
 * null when the target is valid.
 */
const validateTarget = async (targetType, targetId, reporterId, reportedUserId) => {
    if (targetType === 'user') {
        if (targetId && targetId !== reportedUserId) {
            return 'targetId must be the reported user for a user report';
        }
        return null;
    }

    if (!targetId || !isValidId(targetId)) {
        return `A valid targetId is required when reporting a ${targetType}`;
    }

    if (targetType === 'session') {
        const session = await Session.findById(targetId).select('teacherId learnerId');
        if (!session) return 'Session not found';
        if (!session.isParticipant(reporterId) || !session.isParticipant(reportedUserId)) {
            return 'You can only report a session you and this user took part in';
        }
        return null;
    }

    // targetType === 'message'
    const message = await Message.findById(targetId).select('senderId receiverId');
    if (!message) return 'Message not found';
    const parties = [String(message.senderId), String(message.receiverId)];
    if (!parties.includes(reporterId) || String(message.senderId) !== reportedUserId) {
        return 'You can only report a message this user sent to you';
    }
    return null;
};

// ---------------------------------------------------------------------------
// @desc    Report a user (optionally about a specific session or message)
// @route   POST /api/reports
// @access  Private
// ---------------------------------------------------------------------------
const createReport = asyncHandler(async (req, res) => {
    const { reportedUser, reason } = req.body;
    const targetType  = req.body.targetType || 'user';
    const targetId    = req.body.targetId || null;
    const description = (req.body.description || '').trim();
    const reporterId  = req.user.id;

    if (!isValidId(reportedUser)) {
        return res.status(400).json({ success: false, message: 'Invalid id format' });
    }

    if (reportedUser === reporterId) {
        return res.status(400).json({ success: false, message: 'You cannot report yourself' });
    }

    if (reason === REPORT_REASONS.OTHER && !description) {
        return res.status(400).json({ success: false, message: 'Please describe the problem when choosing "Other"' });
    }

    const target = await User.findById(reportedUser).select('fullName');
    if (!target) {
        return res.status(404).json({ success: false, message: 'User not found' });
    }

    const targetError = await validateTarget(targetType, targetId, reporterId, reportedUser);
    if (targetError) {
        return res.status(400).json({ success: false, message: targetError });
    }

    const storedTargetId = targetType === 'user' ? null : targetId;

    const openReport = await Report.exists({
        reporter:     reporterId,
        reportedUser,
        targetType,
        targetId:     storedTargetId,
        status:       { $in: [REPORT_STATUS.PENDING, REPORT_STATUS.UNDER_REVIEW] }
    });
    if (openReport) {
        return res.status(409).json({
            success: false,
            message: 'You already have an open report about this. Our team will review it.'
        });
    }

    let report;
    try {
        report = await Report.create({
            reporter: reporterId,
            reportedUser,
            targetType,
            targetId: storedTargetId,
            reason,
            description
        });
    } catch (error) {
        // Unique partial index — a concurrent duplicate slipped past the check above.
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: 'You already have an open report about this. Our team will review it.'
            });
        }
        throw error;
    }

    notificationService
        .reportReceived(report, target.fullName, getIo(req))
        .catch((err) => console.error('reportReceived notification failed:', err.message));

    res.status(201).json({
        success: true,
        message: 'Report submitted. Thank you — our team will review it.',
        report
    });
});

// ---------------------------------------------------------------------------
// @desc    Reports submitted by the current user
// @route   GET /api/reports/mine
// @access  Private
// ---------------------------------------------------------------------------
const getMyReports = asyncHandler(async (req, res) => {
    const reports = await Report.find({ reporter: req.user.id })
        .select('-reviewedBy -reporter')
        .populate('reportedUser', 'fullName avatar')
        .sort({ createdAt: -1 })
        .limit(100);

    res.status(200).json({
        success: true,
        count:   reports.length,
        reports
    });
});

module.exports = { createReport, getMyReports };
