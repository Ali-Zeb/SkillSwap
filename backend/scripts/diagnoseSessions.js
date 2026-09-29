/**
 * Read-only diagnostic for the Sessions page "Upcoming / Past" counts.
 *
 * Usage (from backend/):
 *   npm run diagnose:sessions -- user@example.com
 *
 * For the given user it lists every session they participate in and which
 * tab the CURRENT getUpcomingSessions / getPastSessions queries would
 * return it in (upcoming / past / NONE), mirroring those queries exactly.
 *
 * Safety:
 *   - Only find / countDocuments / aggregate are used, via the raw driver
 *     collections — no Mongoose models are loaded, so no schema indexes
 *     can be built. autoIndex/autoCreate are disabled as a second guard.
 *   - Output never includes emails, password hashes, tokens, or any
 *     personal data beyond the partner's fullName.
 */
const path     = require('path');
const mongoose = require('mongoose');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { SESSION_STATUS } = require('../config/constants');

mongoose.set('autoIndex', false);
mongoose.set('autoCreate', false);

// Must stay identical to the filters in controllers/sessionController.js.
const UPCOMING_STATUSES = [
    SESSION_STATUS.PENDING_APPROVAL,
    SESSION_STATUS.SCHEDULED,
    SESSION_STATUS.CONFIRMED
];
const PAST_STATUSES = [SESSION_STATUS.COMPLETED, SESSION_STATUS.CANCELLED];

const isRealDate = (d) => d instanceof Date && !Number.isNaN(d.getTime());

const idEquals = (a, b) => a != null && b != null && String(a) === String(b);

const isObjectId = (v) => v != null && typeof v === 'object' && v._bsontype === 'ObjectId';

// The API casts req.user.id to an ObjectId, so a session only matches when
// the user's own participant field is stored as an ObjectId.
const matchedByApi = (session, userId) =>
    [session.teacherId, session.learnerId].some((v) => isObjectId(v) && idEquals(v, userId));

// Mirrors the Mongo semantics of the two controller queries: a date that is
// missing or not stored as a BSON Date never matches $gte/$lt a Date.
const classify = (session, now, userId) => {
    if (!matchedByApi(session, userId)) return 'NONE';

    const dateOk     = isRealDate(session.date);
    const isUpcoming = UPCOMING_STATUSES.includes(session.status) && dateOk && session.date >= now;
    const isPast     = PAST_STATUSES.includes(session.status) || (dateOk && session.date < now);

    if (isUpcoming && isPast) return 'BOTH';
    if (isUpcoming)           return 'upcoming';
    if (isPast)               return 'past';
    return 'NONE';
};

const explainNone = (session, now, userId) => {
    if (!matchedByApi(session, userId)) {
        return 'your participant id is stored as a string, not an ObjectId';
    }
    if (!isRealDate(session.date)) {
        return `date is not a valid BSON Date (stored as ${session.date === null ? 'null' : typeof session.date})`;
    }
    if (session.date >= now && !UPCOMING_STATUSES.includes(session.status)) {
        return `future date but status "${session.status}" is not in the upcoming query`;
    }
    return 'unexpected — check status/date manually';
};

const tally = (counts, key) => { counts[key] = (counts[key] || 0) + 1; };

const main = async () => {
    const email = (process.argv[2] || '').trim().toLowerCase();
    if (!email) {
        console.error('Usage: npm run diagnose:sessions -- <user email>');
        process.exit(1);
    }
    if (!process.env.MONGO_URI) {
        console.error('MONGO_URI is not set (expected in backend/.env).');
        process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI, { autoIndex: false, autoCreate: false });
    const db = mongoose.connection.db;

    const user = await db.collection('users').findOne({ email }, { projection: { _id: 1 } });
    if (!user) {
        console.error('No user found with that email.');
        return;
    }
    const userId = user._id;
    const userIdStr = String(userId);

    // Match the id both as ObjectId (normal) and as a plain string, so any
    // sessions saved with string ids — which the controllers would never
    // match — still show up here and get flagged.
    const participantFilter = {
        $or: [
            { teacherId: userId }, { learnerId: userId },
            { teacherId: userIdStr }, { learnerId: userIdStr }
        ]
    };

    const [totalInCollection, sessions] = await Promise.all([
        db.collection('sessions').countDocuments({}),
        db.collection('sessions')
            .find(participantFilter, {
                projection: { title: 1, status: 1, date: 1, teacherId: 1, learnerId: 1, skillId: 1 }
            })
            .sort({ date: -1 })
            .toArray()
    ]);

    // Resolve partners and skills in two queries, projecting only what is shown.
    const partnerIds = new Set();
    const skillIds   = new Set();
    for (const s of sessions) {
        const partner = idEquals(s.teacherId, userId) ? s.learnerId : s.teacherId;
        if (partner) partnerIds.add(String(partner));
        if (s.skillId) skillIds.add(String(s.skillId));
    }
    const toObjectIds = (set) => [...set]
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

    const [partners, skills] = await Promise.all([
        db.collection('users')
            .find({ _id: { $in: toObjectIds(partnerIds) } }, { projection: { fullName: 1 } })
            .toArray(),
        db.collection('skills')
            .find({ _id: { $in: toObjectIds(skillIds) } }, { projection: { _id: 1 } })
            .toArray()
    ]);
    const partnerName = new Map(partners.map((p) => [String(p._id), p.fullName]));
    const skillExists = new Set(skills.map((s) => String(s._id)));

    const now          = new Date();
    const perTab       = {};
    const perStatus    = {};
    const noneSessions = [];
    const flagged      = [];

    console.log(`\nNow (UTC): ${now.toISOString()}\n`);
    console.log('Per session (newest first):');

    for (const s of sessions) {
        const isTeacher = idEquals(s.teacherId, userId);
        const role      = isTeacher ? 'teacher' : 'learner';
        const partnerId = isTeacher ? s.learnerId : s.teacherId;
        const tab       = classify(s, now, userId);

        const flags = [];
        if (!partnerId || !partnerName.has(String(partnerId))) flags.push(`${isTeacher ? 'learner' : 'teacher'} missing/deleted`);
        if (!s.skillId || !skillExists.has(String(s.skillId))) flags.push('skill missing/deleted');
        if (typeof s.teacherId === 'string' || typeof s.learnerId === 'string') flags.push('participant id stored as string');
        if (s.date != null && !isRealDate(s.date)) flags.push('date not stored as a Date');
        if (idEquals(s.teacherId, s.learnerId)) flags.push('teacher and learner are the same user');

        tally(perTab, tab);
        tally(perStatus, s.status || '(none)');
        if (tab === 'NONE') noneSessions.push({ s, reason: explainNone(s, now, userId) });
        if (flags.length) flagged.push(s);

        console.log([
            `  ${s._id}`,
            `title="${s.title ?? ''}"`,
            `status=${s.status}`,
            `date=${isRealDate(s.date) ? s.date.toISOString() : String(s.date)}`,
            `role=${role}`,
            `partner="${partnerName.get(String(partnerId)) ?? '(deleted user)'}"`,
            `tab=${tab}`,
            flags.length ? `FLAGS: ${flags.join('; ')}` : ''
        ].filter(Boolean).join(' | '));
    }

    console.log('\nSummary');
    console.log(`  Sessions in whole collection : ${totalInCollection}`);
    console.log(`  Sessions for this user       : ${sessions.length}`);
    console.log(`  Other users' sessions        : ${totalInCollection - sessions.length}`);
    console.log(`  Per tab    : ${JSON.stringify(perTab)}`);
    console.log(`  Per status : ${JSON.stringify(perStatus)}`);
    console.log(`  Flagged (deleted refs / bad ids): ${flagged.length}`);
    console.log(`  NONE sessions (in neither tab): ${noneSessions.length}`);
    for (const { s, reason } of noneSessions) {
        console.log(`    ${s._id} | status=${s.status} | ${reason}`);
    }
};

main()
    .catch((err) => {
        console.error('Diagnostic failed:', err.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
