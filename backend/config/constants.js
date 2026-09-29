/**
 * Centralized constants shared across models, controllers, and validation.
 * Keeping these in one place avoids string-literal drift between files
 * (e.g. a typo in one schema's enum vs. a controller's status check).
 */

const SKILL_CATEGORIES = [
    'Programming',
    'Design',
    'Business',
    'Language',
    'Music',
    'Art',
    'Technology',
    'Other'
];

const SKILL_TYPES = ['teach', 'learn'];

const SESSION_STATUS = {
    PENDING_APPROVAL: 'pending_approval',
    SCHEDULED:        'scheduled',
    CONFIRMED:        'confirmed',
    COMPLETED:        'completed',
    CANCELLED:        'cancelled',
    RESCHEDULED:      'rescheduled'
};

const SESSION_TYPES = ['online', 'inperson'];

const REQUEST_STATUS = {
    PENDING:  'pending',
    ACCEPTED: 'accepted',
    DECLINED: 'declined'
};

const DAYS_OF_WEEK = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday'
];

const LIMITS = {
    FULL_NAME_MIN:            2,
    FULL_NAME_MAX:            50,
    HEADLINE_MAX:             100,
    ABOUT_MAX:                500,
    SKILL_NAME_MAX:           50,
    SKILL_DESCRIPTION_MAX:    200,
    SESSION_TITLE_MAX:        100,
    SESSION_DESCRIPTION_MAX:  500,
    MESSAGE_CONTENT_MAX:      1000,
    RATING_COMMENT_MAX:       500,
    REQUEST_MESSAGE_MAX:      300,
    PASSWORD_MIN:             8,
    AVATAR_FILE_SIZE_MB:      2,
    CHAT_FILE_SIZE_MB:        10,
    NOTIFICATION_TITLE_MAX:   100,
    NOTIFICATION_MESSAGE_MAX: 300,
    REPORT_DESCRIPTION_MAX:   1000,
    RESOLUTION_NOTE_MAX:      1000
};

const REPORT_REASONS = {
    HARASSMENT:    'harassment',
    SPAM:          'spam',
    FAKE_PROFILE:  'fake_profile',
    SCAM:          'scam',
    INAPPROPRIATE: 'inappropriate',
    OTHER:         'other'
};

const REPORT_REASON_LABELS = {
    harassment:    'Harassment',
    spam:          'Spam',
    fake_profile:  'Fake profile',
    scam:          'Scam / fraud',
    inappropriate: 'Inappropriate content',
    other:         'Other'
};

const REPORT_STATUS = {
    PENDING:      'pending',
    UNDER_REVIEW: 'under_review',
    RESOLVED:     'resolved',
    DISMISSED:    'dismissed'
};

const REPORT_TARGET_TYPES = ['user', 'session', 'message'];

const USER_ROLES = ['user', 'admin'];

const AUTH_TOKEN_TTL = {
    EMAIL_VERIFICATION_MS: 24 * 60 * 60 * 1000,   // 24 hours
    PASSWORD_RESET_MS:     15 * 60 * 1000         // 15 minutes
};

// Common throwaway-inbox providers blocked at registration. Extend as
// new ones show up in sign-ups; matching includes subdomains.
const DISPOSABLE_EMAIL_DOMAINS = new Set([
    '10minutemail.com', '10minutemail.net', '20minutemail.com', 'anonaddy.me', 'burnermail.io',
    'dispostable.com', 'dropmail.me', 'emailondeck.com', 'fakeinbox.com', 'fakemail.net',
    'getairmail.com', 'getnada.com', 'guerrillamail.biz', 'guerrillamail.com', 'guerrillamail.de',
    'guerrillamail.net', 'guerrillamail.org', 'guerrillamailblock.com', 'harakirimail.com', 'inboxbear.com',
    'incognitomail.org', 'jetable.org', 'mail.tm', 'mailcatch.com', 'maildrop.cc',
    'mailinator.com', 'mailinator.net', 'mailnesia.com', 'mailpoof.com', 'mintemail.com',
    'mohmal.com', 'moakt.com', 'mytemp.email', 'nada.email', 'sharklasers.com',
    'spam4.me', 'spamgourmet.com', 'temp-mail.io', 'temp-mail.org', 'tempail.com',
    'tempmail.com', 'tempmail.net', 'tempmail.plus', 'tempmailo.com', 'tempr.email',
    'throwawaymail.com', 'trashmail.com', 'trashmail.de', 'yopmail.com', 'yopmail.fr',
    'yopmail.net', 'emailfake.com', 'mailforspam.com', 'grr.la', 'spambox.us'
]);

const isDisposableEmail = (email) => {
    const domain = String(email).split('@')[1]?.toLowerCase().trim();
    if (!domain) return false;
    const parts = domain.split('.');
    // Check the domain and each parent (sub.mailinator.com → mailinator.com).
    for (let i = 0; i < parts.length - 1; i++) {
        if (DISPOSABLE_EMAIL_DOMAINS.has(parts.slice(i).join('.'))) return true;
    }
    return false;
};

const AUDIT_ACTIONS = {
    USER_DEACTIVATED: 'user_deactivated',
    USER_ACTIVATED:   'user_activated',
    ROLE_CHANGED:     'role_changed',
    REPORT_UPDATED:   'report_updated'
};

const NOTIFICATION_TYPES = {
    REQUEST_RECEIVED:  'request_received',
    REQUEST_ACCEPTED:  'request_accepted',
    REQUEST_DECLINED:  'request_declined',
    SESSION_PROPOSED:  'session_proposed',
    SESSION_APPROVED:  'session_approved',
    SESSION_DECLINED:  'session_declined',
    SESSION_CANCELLED: 'session_cancelled',
    SESSION_REMINDER:  'session_reminder',
    SESSION_COMPLETED: 'session_completed',
    RATING_RECEIVED:   'rating_received',
    NEW_MESSAGE:       'new_message',
    BADGE_EARNED:      'badge_earned',
    REPORT_RECEIVED:   'report_received'
};

// ---------------------------------------------------------------------------
// Badge type keys — the only badge data persisted in MongoDB.
// User.badges[] stores { type, earnedAt } — never labels or icons.
// Presentation data lives in BADGE_META so it can change without migration.
// ---------------------------------------------------------------------------
const BADGE_TYPES = {
    FIRST_SESSION:  'first_session',
    EXPERT_MENTOR:  'expert_mentor',
    TOP_TEACHER:    'top_teacher',
    HIGHLY_RATED:   'highly_rated',
    PERFECT_SCORE:  'perfect_score',
    FAST_RESPONDER: 'fast_responder',
    SKILL_MASTER:   'skill_master'
};

// ---------------------------------------------------------------------------
// Badge presentation metadata — keyed by BADGE_TYPES value.
// Never stored in MongoDB. Consumed by the frontend and by
// notificationService when building badge-earned notification messages.
// ---------------------------------------------------------------------------
const BADGE_META = {
    first_session:  { label: 'First Session',  icon: '🥇', description: 'Complete your first session' },
    expert_mentor:  { label: 'Expert Mentor',  icon: '🏆', description: 'Teach 10 completed sessions' },
    top_teacher:    { label: 'Top Teacher',    icon: '🎓', description: 'Teach 5 sessions with an average rating of 4.8+' },
    highly_rated:   { label: 'Highly Rated',   icon: '⭐', description: 'Receive 10 ratings with an average of 4.0+' },
    perfect_score:  { label: 'Perfect Score',  icon: '💯', description: 'Get five 5-star ratings in a row' },
    fast_responder: { label: 'Fast Responder', icon: '⚡', description: 'Answer 80% of 5+ requests within 24 hours' },
    skill_master:   { label: 'Skill Master',   icon: '🎯', description: 'Offer to teach 3 or more skills' }
};

// ---------------------------------------------------------------------------
// Badge thresholds — all numeric eligibility conditions.
// Change a threshold here; no logic files need to change.
// ---------------------------------------------------------------------------
const BADGE_THRESHOLDS = {
    FIRST_SESSION_MIN_COMPLETED:     1,
    EXPERT_MENTOR_MIN_TAUGHT:        10,
    TOP_TEACHER_MIN_RATING:          4.8,
    TOP_TEACHER_MIN_SESSIONS_TAUGHT: 5,
    HIGHLY_RATED_MIN_RATING:         4.0,
    HIGHLY_RATED_MIN_RATINGS_COUNT:  10,
    PERFECT_SCORE_WINDOW:            5,   // last N ratings must all be 5 stars
    FAST_RESPONDER_MIN_RATE:         0.8,
    FAST_RESPONDER_MIN_REQUESTS:     5,
    SKILL_MASTER_MIN_TEACH_SKILLS:   3
};

// ---------------------------------------------------------------------------
// Profile completion weights — must sum to 100.
// Used exclusively by utils/profileCompletion.js.
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Real-name rule. A "word" is one or more letters (Latin incl. accented, or
// Arabic/Urdu script), optionally joined by a single . ' or - to more
// letters ("Ali-Zeb", "O'Brien", "M.Ali"), and may end with a dot ("M.").
// Words are separated by exactly one space ("M. Ihtesham", "Ali Zeb").
// Digits and any other symbols are rejected. Length (2–50) is checked
// separately against LIMITS so the messages can be specific.
// The same pattern is mirrored in frontend/src/utils/validators.js.
// ---------------------------------------------------------------------------
const NAME_LETTER = "[A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u024F\\u0621-\\u063A\\u0641-\\u0652\\u0671-\\u06D3\\u06FA-\\u06FC]";
const NAME_WORD   = `${NAME_LETTER}+(?:[.'-]${NAME_LETTER}+)*\\.?`;
const NAME_REGEX  = new RegExp(`^${NAME_WORD}(?: ${NAME_WORD})*$`);

const PROFILE_COMPLETION_WEIGHTS = {
    avatar:     20,
    headline:   15,
    about:      15,
    location:   10,
    teachSkill: 20,   // user has ≥ 1 skill with type === 'teach'
    learnSkill: 20    // user has ≥ 1 skill with type === 'learn'
};

module.exports = {
    SKILL_CATEGORIES,
    SKILL_TYPES,
    SESSION_STATUS,
    SESSION_TYPES,
    REQUEST_STATUS,
    DAYS_OF_WEEK,
    LIMITS,
    NOTIFICATION_TYPES,
    BADGE_TYPES,
    BADGE_META,
    BADGE_THRESHOLDS,
    PROFILE_COMPLETION_WEIGHTS,
    NAME_REGEX,
    REPORT_REASONS,
    REPORT_REASON_LABELS,
    REPORT_STATUS,
    REPORT_TARGET_TYPES,
    USER_ROLES,
    AUDIT_ACTIONS,
    AUTH_TOKEN_TTL,
    isDisposableEmail
};