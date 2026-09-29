const mongoose      = require('mongoose');
const User          = require('../models/User');
const Session       = require('../models/Session');
const Rating        = require('../models/Rating');
const Report        = require('../models/Report');
const SupportTicket = require('../models/SupportTicket');
const { SESSION_STATUS, REPORT_STATUS, SUPPORT_STATUS, BADGE_META } = require('../config/constants');

/**
 * Admin analytics built from aggregation pipelines. Admin accounts are
 * excluded from every number (they are operators, not members).
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RANGE_DAYS = 366;
const MEMBER = { role: { $ne: 'admin' } };

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

/**
 * ?range=7d|30d|90d (default 30d) or ?range=custom&from=YYYY-MM-DD&to=YYYY-MM-DD.
 * Returns an inclusive UTC day window { from, to (exclusive end), days, label }.
 */
const resolveRange = (query) => {
    const range = query.range || '30d';
    const startOfDay = (d) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const today = startOfDay(new Date());

    if (['7d', '30d', '90d'].includes(range)) {
        const days = parseInt(range, 10);
        return { range, from: new Date(today.getTime() - (days - 1) * DAY_MS), to: new Date(today.getTime() + DAY_MS), days };
    }
    if (range !== 'custom') throw httpError(400, 'range must be one of: 7d, 30d, 90d, custom');

    const parse = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(s || '') ? new Date(`${s}T00:00:00Z`) : null);
    const from = parse(query.from);
    const toDay = parse(query.to);
    if (!from || !toDay || Number.isNaN(from.getTime()) || Number.isNaN(toDay.getTime())) {
        throw httpError(400, 'Custom range needs from and to dates (YYYY-MM-DD)');
    }
    if (toDay < from) throw httpError(400, 'The end date must be on or after the start date');
    const days = Math.round((toDay - from) / DAY_MS) + 1;
    if (days > MAX_RANGE_DAYS) throw httpError(400, `A custom range can cover at most ${MAX_RANGE_DAYS} days`);
    return { range, from, to: new Date(toDay.getTime() + DAY_MS), days };
};

const inRange = (field, r) => ({ [field]: { $gte: r.from, $lt: r.to } });

// Daily counts for a collection, with missing days filled with 0.
const dailySeries = async (Model, match, dateField, r) => {
    const rows = await Model.aggregate([
        { $match: { ...match, ...inRange(dateField, r) } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}`, timezone: 'UTC' } }, count: { $sum: 1 } } }
    ]);
    const byDay = new Map(rows.map((x) => [x._id, x.count]));
    const out = [];
    for (let t = r.from.getTime(); t < r.to.getTime(); t += DAY_MS) {
        const day = new Date(t).toISOString().slice(0, 10);
        out.push({ date: day, value: byDay.get(day) || 0 });
    }
    return out;
};

const topSkills = (type) => User.aggregate([
    { $match: { ...MEMBER, isActive: true } },
    { $unwind: '$skills' },
    { $match: { 'skills.type': type } },
    { $group: { _id: '$skills.skillId', members: { $sum: 1 } } },
    { $sort: { members: -1, _id: 1 } },
    { $limit: 10 },
    { $lookup: { from: 'skills', localField: '_id', foreignField: '_id', as: 'skill' } },
    { $project: { _id: 0, skillId: '$_id', name: { $ifNull: [{ $first: '$skill.name' }, 'Deleted skill'] }, category: { $first: '$skill.category' }, members: 1 } }
]);

const topTeachers = (r) => Session.aggregate([
    { $match: { status: SESSION_STATUS.COMPLETED, ...inRange('date', r) } },
    { $group: { _id: '$teacherId', completed: { $sum: 1 } } },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $match: { 'user.role': { $ne: 'admin' } } },
    { $lookup: {
        from: 'ratings', let: { uid: '$_id' },
        pipeline: [{ $match: { $expr: { $eq: ['$revieweeId', '$$uid'] } } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }],
        as: 'rating'
    } },
    { $project: {
        _id: 0, userId: '$_id', fullName: '$user.fullName', completed: 1,
        averageRating: { $round: [{ $ifNull: [{ $first: '$rating.avg' }, 0] }, 1] },
        ratingsCount: { $ifNull: [{ $first: '$rating.count' }, 0] }
    } },
    { $sort: { completed: -1, averageRating: -1, fullName: 1 } },
    { $limit: 10 }
]);

const getPlatformReport = async (query) => {
    const r = resolveRange(query);

    const [
        newUsers, newUsersSeries, sessionsCreated, sessionsSeries, sessionOutcomes,
        taught, requested, teachers, ratingAgg, complaintsReceived, complaintsResolved,
        complaintsSeries, supportOpen, supportCreated, supportResolved, firstResponse
    ] = await Promise.all([
        User.countDocuments({ ...MEMBER, ...inRange('createdAt', r) }),
        dailySeries(User, MEMBER, 'createdAt', r),
        Session.countDocuments(inRange('createdAt', r)),
        dailySeries(Session, {}, 'createdAt', r),
        Session.aggregate([{ $match: inRange('date', r) }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
        topSkills('teach'),
        topSkills('learn'),
        topTeachers(r),
        Rating.aggregate([{ $match: inRange('createdAt', r) }, { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$rating' } } }]),
        Report.countDocuments(inRange('createdAt', r)),
        Report.countDocuments({ status: REPORT_STATUS.RESOLVED, ...inRange('updatedAt', r) }),
        dailySeries(Report, {}, 'createdAt', r),
        SupportTicket.countDocuments({ status: { $in: [SUPPORT_STATUS.OPEN, SUPPORT_STATUS.IN_PROGRESS] } }),
        SupportTicket.countDocuments(inRange('createdAt', r)),
        SupportTicket.countDocuments({ status: { $in: [SUPPORT_STATUS.RESOLVED, SUPPORT_STATUS.CLOSED] }, ...inRange('updatedAt', r) }),
        SupportTicket.aggregate([
            { $match: { firstResponseAt: { $ne: null }, ...inRange('createdAt', r) } },
            { $group: { _id: null, avgMs: { $avg: { $subtract: ['$firstResponseAt', '$createdAt'] } }, count: { $sum: 1 } } }
        ])
    ]);

    const outcome = Object.fromEntries(sessionOutcomes.map((x) => [x._id, x.count]));
    const completed = outcome[SESSION_STATUS.COMPLETED] || 0;
    const cancelled = outcome[SESSION_STATUS.CANCELLED] || 0;
    const rating = ratingAgg[0] || { count: 0, avg: 0 };
    const fr = firstResponse[0];

    return {
        range: { key: r.range, from: r.from.toISOString().slice(0, 10), to: new Date(r.to.getTime() - DAY_MS).toISOString().slice(0, 10), days: r.days },
        generatedAt: new Date().toISOString(),
        users:    { new: newUsers },
        sessions: {
            created: sessionsCreated,
            // Sessions scheduled in the range, by outcome.
            completed,
            cancelled,
            completionRate: completed + cancelled > 0 ? Math.round((completed / (completed + cancelled)) * 1000) / 10 : null
        },
        ratings:    { count: rating.count, average: Math.round((rating.avg || 0) * 10) / 10 },
        complaints: { received: complaintsReceived, resolved: complaintsResolved },
        support:    {
            open: supportOpen,
            created: supportCreated,
            resolved: supportResolved,
            avgFirstResponseHours: fr ? Math.round((fr.avgMs / 3600000) * 10) / 10 : null
        },
        topSkills:   { taught, requested },
        topTeachers: teachers,
        trends: { newUsers: newUsersSeries, sessionsCreated: sessionsSeries, complaints: complaintsSeries },
        definitions: {
            completionRate: 'Completed ÷ (completed + cancelled) among sessions scheduled in the range',
            topSkills: 'Current member profiles (active members), not limited to the range',
            topTeachers: 'Completed sessions taught in the range; rating is the all-time average received',
            complaintsResolved: 'Reports marked resolved during the range'
        }
    };
};

const getUserReport = async (userId) => {
    if (!mongoose.Types.ObjectId.isValid(userId)) throw httpError(400, 'Invalid id format');
    const user = await User.findById(userId).select('fullName email avatar role isActive deactivationReason reputation badges createdAt lastActive skills').populate('skills.skillId', 'name');
    if (!user || user.role === 'admin') throw httpError(404, 'Member not found');

    const id = user._id;
    const [taught, learned, byStatus, ratingAgg, reports] = await Promise.all([
        Session.countDocuments({ teacherId: id }),
        Session.countDocuments({ learnerId: id }),
        Session.aggregate([{ $match: { $or: [{ teacherId: id }, { learnerId: id }] } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
        Rating.aggregate([{ $match: { revieweeId: id } }, { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }]),
        Report.find({ reportedUser: id }).select('reason status targetType createdAt updatedAt resolutionNote').sort({ createdAt: -1 }).limit(100).lean()
    ]);
    const status = Object.fromEntries(byStatus.map((x) => [x._id, x.count]));
    const rating = ratingAgg[0];

    return {
        generatedAt: new Date().toISOString(),
        user: {
            _id: id, fullName: user.fullName, email: user.email, avatar: user.avatar,
            isActive: user.isActive, deactivationReason: user.deactivationReason,
            joinedAt: user.createdAt, lastActive: user.lastActive, reputation: user.reputation,
            teaches: user.skills.filter((s) => s.type === 'teach').map((s) => s.skillId?.name).filter(Boolean),
            learns:  user.skills.filter((s) => s.type === 'learn').map((s) => s.skillId?.name).filter(Boolean)
        },
        sessions: {
            taught, learned,
            completed: status[SESSION_STATUS.COMPLETED] || 0,
            cancelled: status[SESSION_STATUS.CANCELLED] || 0,
            upcomingOrPending: (status[SESSION_STATUS.SCHEDULED] || 0) + (status[SESSION_STATUS.CONFIRMED] || 0) + (status[SESSION_STATUS.PENDING_APPROVAL] || 0) + (status[SESSION_STATUS.RESCHEDULED] || 0)
        },
        ratings: { count: rating?.count || 0, average: Math.round((rating?.avg || 0) * 10) / 10 },
        badges: (user.badges || []).map((b) => ({ type: b.type, label: BADGE_META[b.type]?.label || b.type, earnedAt: b.earnedAt })),
        reports: {
            total: reports.length,
            byStatus: reports.reduce((acc, x) => ({ ...acc, [x.status]: (acc[x.status] || 0) + 1 }), {}),
            items: reports
        }
    };
};

module.exports = { resolveRange, getPlatformReport, getUserReport };
