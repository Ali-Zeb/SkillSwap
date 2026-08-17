// ─── Date & Time ──────────────────────────────────────────────────────────────

/**
 * Formats a date string or Date object into a readable format.
 * e.g. "July 2, 2026"
 */
export const formatDate = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })
}

/**
 * Formats a date into a short format.
 * e.g. "Jul 2, 2026"
 */
export const formatDateShort = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

/**
 * Formats a date into time only.
 * e.g. "3:30 PM"
 */
export const formatTime = (date) => {
    if (!date) return ''
    return new Date(date).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    })
}

/**
 * Formats a date into both date and time.
 * e.g. "Jul 2, 2026 at 3:30 PM"
 */
export const formatDateTime = (date) => {
    if (!date) return ''
    return `${formatDateShort(date)} at ${formatTime(date)}`
}

/**
 * Returns a relative time string.
 * e.g. "2 hours ago", "just now", "3 days ago"
 */
export const timeAgo = (date) => {
    if (!date) return ''
    const now = new Date()
    const past = new Date(date)
    const diffMs = now - past
    const diffSecs = Math.floor(diffMs / 1000)
    const diffMins = Math.floor(diffSecs / 60)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)

    if (diffSecs < 60) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffWeeks < 4) return `${diffWeeks}w ago`
    if (diffMonths < 12) return `${diffMonths}mo ago`
    return formatDateShort(date)
}

/**
 * Formats session duration from minutes into a readable string.
 * e.g. 90 → "1h 30m", 60 → "1h", 30 → "30m"
 */
export const formatDuration = (minutes) => {
    if (!minutes) return ''
    const h = Math.floor(minutes / 60)
    const m = minutes % 60
    if (h === 0) return `${m}m`
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
}

// ─── String Utilities ─────────────────────────────────────────────────────────

/**
 * Truncates a string to a maximum length, adding "..." if truncated.
 */
export const truncate = (str, maxLength = 100) => {
    if (!str) return ''
    if (str.length <= maxLength) return str
    return str.slice(0, maxLength).trimEnd() + '...'
}

/**
 * Capitalizes the first letter of a string.
 */
export const capitalize = (str) => {
    if (!str) return ''
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

/**
 * Converts a string to title case.
 * e.g. "web development" → "Web Development"
 */
export const toTitleCase = (str) => {
    if (!str) return ''
    return str
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ')
}

/**
 * Returns initials from a full name — used as avatar fallback.
 * e.g. "Ali Zeb" → "AZ", "Ali" → "A"
 */
export const getInitials = (fullName) => {
    if (!fullName) return '?'
    const parts = fullName.trim().split(' ').filter(Boolean)
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase()
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

/**
 * Returns the full avatar URL, falling back to a generated initial-based
 * placeholder if the user has no avatar set.
 */
export const getAvatarUrl = (avatar, fullName) => {
    if (avatar) {
        if (avatar.startsWith('http://') || avatar.startsWith('https://')) {
            return avatar
        }
        if (avatar.startsWith('/uploads/')) {
            return 'http://localhost:5000' + avatar
        }
        if (!avatar.includes('/')) {
            return 'http://localhost:5000/uploads/' + avatar
        }
        return 'http://localhost:5000/' + avatar
    }
    const name     = fullName || 'User'
    const initials = name.split(' ').map(function(n) { return n[0] }).join('').toUpperCase().slice(0, 2)
    return 'https://ui-avatars.com/api/?name=' + encodeURIComponent(initials) + '&background=2563eb&color=fff&size=128&bold=true&rounded=true'
}

// ─── Reputation & Ratings ─────────────────────────────────────────────────────

/**
 * Converts a numeric rating (0–5) into an array of star states.
 * e.g. 3.5 → ['full', 'full', 'full', 'half', 'empty']
 */
export const getStarRating = (rating) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
        if (rating >= i) {
            stars.push('full')
        } else if (rating >= i - 0.5) {
            stars.push('half')
        } else {
            stars.push('empty')
        }
    }
    return stars
}

/**
 * Formats a reputation number for display.
 * e.g. 4.666... → "4.7", 5 → "5.0", 0 → "0.0"
 */
export const formatReputation = (reputation) => {
    if (!reputation && reputation !== 0) return '0.0'
    return Number(reputation).toFixed(1)
}

// ─── Skill Utilities ──────────────────────────────────────────────────────────

/**
 * Filters a user's skills by type ('teach' or 'learn').
 */
export const filterSkillsByType = (skills = [], type) => {
    return skills.filter((s) => s.type === type && s.skillId)
}

/**
 * Returns a color class for a skill category badge.
 */
export const getCategoryColor = (category) => {
    const colors = {
        Programming:  'badge-primary',
        Design:       'badge-secondary',
        Business:     'badge-warning',
        Language:     'badge-success',
        Music:        'badge-error',
        Art:          'badge-warning',
        Technology:   'badge-primary',
        Other:        'badge',
    }
    return colors[category] || 'badge'
}

// ─── Validation Helpers ───────────────────────────────────────────────────────

/**
 * Returns true if a string is a valid email address.
 */
export const isValidEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Returns true if a password meets the minimum requirements.
 */
export const isValidPassword = (password) => {
    return password && password.length >= 8
}

// ─── Session Utilities ────────────────────────────────────────────────────────

/**
 * Returns a Tailwind color class for a session status badge.
 */
export const getSessionStatusColor = (status) => {
    const colors = {
        scheduled:   'badge-primary',
        confirmed:   'badge-success',
        completed:   'badge-secondary',
        cancelled:   'badge-error',
        rescheduled: 'badge-warning',
    }
    return colors[status] || 'badge'
}

/**
 * Returns a Tailwind color class for a request status badge.
 */
export const getRequestStatusColor = (status) => {
    const colors = {
        pending:  'badge-warning',
        accepted: 'badge-success',
        declined: 'badge-error',
    }
    return colors[status] || 'badge'
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

/**
 * Safely parses JSON, returning a fallback value if parsing fails.
 */
export const safeJsonParse = (str, fallback = null) => {
    try {
        return JSON.parse(str)
    } catch {
        return fallback
    }
}

/**
 * Generates a random placeholder color for skill icons.
 */
export const getSkillColor = (skillName = '') => {
    const colors = [
        'bg-primary-500/20 text-primary-300',
        'bg-secondary-500/20 text-secondary-300',
        'bg-purple-500/20 text-purple-300',
        'bg-pink-500/20 text-pink-300',
        'bg-orange-500/20 text-orange-300',
        'bg-green-500/20 text-green-300',
    ]
    const index = skillName.charCodeAt(0) % colors.length
    return colors[index]
}