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
    NOTIFICATION_TITLE_MAX:   100,
    NOTIFICATION_MESSAGE_MAX: 300
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
    BADGE_EARNED:      'badge_earned'
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
    first_session:  { label: 'First Session',  icon: '🥇' },
    expert_mentor:  { label: 'Expert Mentor',  icon: '🏆' },
    top_teacher:    { label: 'Top Teacher',    icon: '🎓' },
    highly_rated:   { label: 'Highly Rated',   icon: '⭐' },
    perfect_score:  { label: 'Perfect Score',  icon: '💯' },
    fast_responder: { label: 'Fast Responder', icon: '⚡' },
    skill_master:   { label: 'Skill Master',   icon: '🎯' }
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
    PROFILE_COMPLETION_WEIGHTS
};