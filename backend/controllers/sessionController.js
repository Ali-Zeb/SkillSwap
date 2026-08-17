const Session             = require('../models/Session');
const { SESSION_STATUS }  = require('../config/constants');
const asyncHandler        = require('../utils/asyncHandler');
const notificationService = require('../services/notificationService');

/**
 * Returns the Socket.io instance registered on the Express app.
 * Using req.app.get('io') avoids circular imports — controllers never
 * need to import the server module directly.
 * Returns null if io has not been registered, which is safe because
 * notificationService skips the emit when io is null.
 */
const getIo = (req) => req.app.get('io') || null;

/**
 * Resolves the partner's _id from a populated session document.
 * Works for both teacher and learner sides.
 *
 * @param {Session} session   Populated session with teacherId/learnerId as objects
 * @param {string}  userId    The current user's id string
 * @returns {ObjectId}        The other participant's _id
 */
const getPartnerId = (session, userId) =>
    session.teacherId._id.toString() === userId
        ? session.learnerId._id
        : session.teacherId._id;

/**
 * Resolves the partner's fullName from a populated session document.
 */
const getPartnerName = (session, userId) =>
    session.teacherId._id.toString() === userId
        ? session.learnerId.fullName
        : session.teacherId.fullName;

// ---------------------------------------------------------------------------
// @desc    Create a new session proposal (starts as pending_approval)
// @route   POST /api/sessions
// @access  Private
// ---------------------------------------------------------------------------
const createSession = asyncHandler(async (req, res) => {
    const {
        learnerId,
        teacherId,
        skillId,
        title,
        description,
        date,
        duration,
        sessionType,
        meetingLink,
        location
    } = req.body;

    if (req.user.id !== learnerId && req.user.id !== teacherId) {
        return res.status(403).json({
            success: false,
            message: 'You can only create sessions you are part of'
        });
    }

    const session = await Session.create({
        teacherId,
        learnerId,
        skillId,
        title,
        description,
        date,
        duration,
        sessionType,
        meetingLink,
        location,
        proposedBy: req.user.id
    });

    await session.populate([
        { path: 'teacherId', select: 'fullName avatar' },
        { path: 'learnerId', select: 'fullName avatar' },
        { path: 'skillId',   select: 'name category'  }
    ]);

    const partnerId = getPartnerId(session, req.user.id);

    notificationService
        .sessionProposed(partnerId, req.user.fullName, session._id, session.title, session.date, getIo(req))
        .catch((err) => console.error('sessionProposed notification failed:', err.message));

    res.status(201).json({
        success: true,
        message: 'Session proposed. Waiting for partner confirmation.',
        session
    });
});

// ---------------------------------------------------------------------------
// @desc    Approve a pending_approval session (non-proposer confirms)
// @route   PUT /api/sessions/:id/approve
// @access  Private
// ---------------------------------------------------------------------------
const approveSession = asyncHandler(async (req, res) => {
    const session = await Session.findById(req.params.id)
        .populate('teacherId', 'fullName avatar')
        .populate('learnerId', 'fullName avatar')
        .populate('skillId',   'name category');

    if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (!session.isParticipant(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Not authorized to approve this session' });
    }

    if (session.status !== SESSION_STATUS.PENDING_APPROVAL) {
        return res.status(400).json({
            success: false,
            message: `Session cannot be approved — current status is "${session.status}"`
        });
    }

    // Guard: proposedBy may be null for sessions created before this field existed.
    // If proposedBy is set, only the partner (non-proposer) may approve.
    if (session.proposedBy && session.proposedBy.toString() === req.user.id) {
        return res.status(400).json({
            success: false,
            message: 'You cannot approve your own session proposal'
        });
    }

    session.status = SESSION_STATUS.SCHEDULED;
    await session.save();

    // Notify the proposer (if known) that the session is confirmed
    if (session.proposedBy) {
        notificationService
            .sessionApproved(session.proposedBy, req.user.fullName, session._id, session.title, getIo(req))
            .catch((err) => console.error('sessionApproved notification failed:', err.message));
    }

    res.status(200).json({
        success: true,
        message: 'Session confirmed. It is now scheduled.',
        session
    });
});

// ---------------------------------------------------------------------------
// @desc    Decline a pending_approval session (non-proposer rejects)
// @route   PUT /api/sessions/:id/decline
// @access  Private
// ---------------------------------------------------------------------------
const declineSession = asyncHandler(async (req, res) => {
    const session = await Session.findById(req.params.id)
        .populate('teacherId', 'fullName avatar')
        .populate('learnerId', 'fullName avatar')
        .populate('skillId',   'name category');

    if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (!session.isParticipant(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Not authorized to decline this session' });
    }

    if (session.status !== SESSION_STATUS.PENDING_APPROVAL) {
        return res.status(400).json({
            success: false,
            message: `Session cannot be declined — current status is "${session.status}"`
        });
    }

    if (session.proposedBy && session.proposedBy.toString() === req.user.id) {
        return res.status(400).json({
            success: false,
            message: 'You cannot decline your own proposal — use cancel instead'
        });
    }

    session.status       = SESSION_STATUS.CANCELLED;
    session.cancelReason = req.body.reason || 'Declined by partner';
    await session.save();

    if (session.proposedBy) {
        notificationService
            .sessionDeclined(session.proposedBy, req.user.fullName, session._id, session.title, getIo(req))
            .catch((err) => console.error('sessionDeclined notification failed:', err.message));
    }

    res.status(200).json({
        success: true,
        message: 'Session declined.',
        session
    });
});

// ---------------------------------------------------------------------------
// @desc    Propose a new time for an existing session (resets to pending_approval)
// @route   PUT /api/sessions/:id/reschedule
// @access  Private
// ---------------------------------------------------------------------------
const rescheduleSession = asyncHandler(async (req, res) => {
    const { date, duration, meetingLink, location } = req.body;

    const session = await Session.findById(req.params.id)
        .populate('teacherId', 'fullName avatar')
        .populate('learnerId', 'fullName avatar')
        .populate('skillId',   'name category');

    if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (!session.isParticipant(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Not authorized to reschedule this session' });
    }

    if (
        session.status !== SESSION_STATUS.PENDING_APPROVAL &&
        session.status !== SESSION_STATUS.SCHEDULED
    ) {
        return res.status(400).json({
            success: false,
            message: `Session cannot be rescheduled — current status is "${session.status}"`
        });
    }

    session.date       = date;
    if (duration)    session.duration    = duration;
    if (meetingLink !== undefined) session.meetingLink = meetingLink;
    if (location    !== undefined) session.location    = location;

    // Reset to pending_approval so the other participant must confirm
    // the new time. Update proposedBy to the rescheduler.
    session.status     = SESSION_STATUS.PENDING_APPROVAL;
    session.proposedBy = req.user.id;
    await session.save();

    const partnerId = getPartnerId(session, req.user.id);

    notificationService
        .sessionProposed(partnerId, req.user.fullName, session._id, session.title, session.date, getIo(req))
        .catch((err) => console.error('reschedule notification failed:', err.message));

    res.status(200).json({
        success: true,
        message: 'New time proposed. Waiting for partner confirmation.',
        session
    });
});

// ---------------------------------------------------------------------------
// @desc    Get upcoming sessions for the current user
// @route   GET /api/sessions/upcoming
// @access  Private
// ---------------------------------------------------------------------------
const getUpcomingSessions = asyncHandler(async (req, res) => {
    const sessions = await Session.find({
        $and: [
            {
                $or: [
                    { teacherId: req.user.id },
                    { learnerId: req.user.id }
                ]
            },
            {
                // Include pending_approval so the invitee sees proposals
                // awaiting their response alongside confirmed sessions.
                status: {
                    $in: [
                        SESSION_STATUS.PENDING_APPROVAL,
                        SESSION_STATUS.SCHEDULED,
                        SESSION_STATUS.CONFIRMED
                    ]
                }
            },
            { date: { $gte: new Date() } }
        ]
    })
        .populate('teacherId', 'fullName avatar')
        .populate('learnerId', 'fullName avatar')
        .populate('skillId',   'name category')
        .sort({ date: 1 });

    res.status(200).json({
        success: true,
        count:   sessions.length,
        sessions
    });
});

// ---------------------------------------------------------------------------
// @desc    Get past/completed/cancelled sessions for the current user
// @route   GET /api/sessions/past
// @access  Private
// ---------------------------------------------------------------------------
const getPastSessions = asyncHandler(async (req, res) => {
    // $and wrapping two $or conditions is intentional — this is the fix
    // for the original project's duplicate $or key bug where the second
    // $or silently overwrote the first, leaking other users' sessions.
    const sessions = await Session.find({
        $and: [
            {
                $or: [
                    { teacherId: req.user.id },
                    { learnerId: req.user.id }
                ]
            },
            {
                $or: [
                    { status: SESSION_STATUS.COMPLETED },
                    { status: SESSION_STATUS.CANCELLED },
                    { date:   { $lt: new Date() }      }
                ]
            }
        ]
    })
        .populate('teacherId', 'fullName avatar')
        .populate('learnerId', 'fullName avatar')
        .populate('skillId',   'name category')
        .sort({ date: -1 });

    res.status(200).json({
        success: true,
        count:   sessions.length,
        sessions
    });
});

// ---------------------------------------------------------------------------
// @desc    Get a single session by id
// @route   GET /api/sessions/:id
// @access  Private
// ---------------------------------------------------------------------------
const getSessionById = asyncHandler(async (req, res) => {
    const session = await Session.findById(req.params.id)
        .populate('teacherId', 'fullName avatar')
        .populate('learnerId', 'fullName avatar')
        .populate('skillId',   'name category');

    if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (!session.isParticipant(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Not authorized to view this session' });
    }

    res.status(200).json({ success: true, session });
});

// ---------------------------------------------------------------------------
// @desc    Update session fields (general edit, not the approval workflow)
// @route   PUT /api/sessions/:id
// @access  Private
// ---------------------------------------------------------------------------
const updateSession = asyncHandler(async (req, res) => {
    const session = await Session.findById(req.params.id);

    if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (!session.isParticipant(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Not authorized to modify this session' });
    }

    const allowedUpdates = ['title', 'description', 'date', 'duration', 'sessionType', 'meetingLink', 'location'];

    allowedUpdates.forEach((field) => {
        if (req.body[field] !== undefined) {
            session[field] = req.body[field];
        }
    });

    if (req.body.date) {
        session.status = SESSION_STATUS.RESCHEDULED;
    }

    await session.save();

    res.status(200).json({
        success: true,
        message: 'Session updated successfully',
        session
    });
});

// ---------------------------------------------------------------------------
// @desc    Cancel a session
// @route   PUT /api/sessions/:id/cancel
// @access  Private
// ---------------------------------------------------------------------------
const cancelSession = asyncHandler(async (req, res) => {
    const session = await Session.findById(req.params.id)
        .populate('teacherId', 'fullName avatar')
        .populate('learnerId', 'fullName avatar')
        .populate('skillId',   'name category');

    if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (!session.isParticipant(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Not authorized to cancel this session' });
    }

    if (session.status === SESSION_STATUS.COMPLETED) {
        return res.status(400).json({ success: false, message: 'Cannot cancel a completed session' });
    }

    if (session.status === SESSION_STATUS.CANCELLED) {
        return res.status(400).json({ success: false, message: 'Session is already cancelled' });
    }

    session.status       = SESSION_STATUS.CANCELLED;
    session.cancelReason = req.body.reason || '';
    await session.save();

    const partnerId = getPartnerId(session, req.user.id);

    notificationService
        .sessionCancelled(partnerId, req.user.fullName, session._id, session.title, getIo(req))
        .catch((err) => console.error('sessionCancelled notification failed:', err.message));

    res.status(200).json({
        success: true,
        message: 'Session cancelled',
        session
    });
});

// ---------------------------------------------------------------------------
// @desc    Mark a session as completed
// @route   PUT /api/sessions/:id/complete
// @access  Private
// ---------------------------------------------------------------------------
const completeSession = asyncHandler(async (req, res) => {
    const session = await Session.findById(req.params.id)
        .populate('teacherId', 'fullName avatar')
        .populate('learnerId', 'fullName avatar')
        .populate('skillId',   'name category');

    if (!session) {
        return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (!session.isParticipant(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Not authorized to complete this session' });
    }

    if (session.status === SESSION_STATUS.CANCELLED) {
        return res.status(400).json({ success: false, message: 'Cannot complete a cancelled session' });
    }

    if (session.status === SESSION_STATUS.COMPLETED) {
        return res.status(400).json({ success: false, message: 'Session is already completed' });
    }

    session.status = SESSION_STATUS.COMPLETED;
    await session.save();

    const io          = getIo(req);
    const teacherId   = session.teacherId._id;
    const learnerId   = session.learnerId._id;
    const teacherName = session.teacherId.fullName;
    const learnerName = session.learnerId.fullName;

    // Notify both participants to rate each other.
    // Failures are isolated — one failed notification does not affect the other.
    notificationService
        .sessionCompleted(teacherId, learnerName, session._id, session.title, io)
        .catch((err) => console.error('sessionCompleted notification (teacher) failed:', err.message));

    notificationService
        .sessionCompleted(learnerId, teacherName, session._id, session.title, io)
        .catch((err) => console.error('sessionCompleted notification (learner) failed:', err.message));

    res.status(200).json({
        success: true,
        message: 'Session marked as completed',
        session
    });
});

module.exports = {
    createSession,
    approveSession,
    declineSession,
    rescheduleSession,
    getUpcomingSessions,
    getPastSessions,
    getSessionById,
    updateSession,
    cancelSession,
    completeSession
};