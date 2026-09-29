// Mirrors the support constants in backend/config/constants.js.
export const SUPPORT_CATEGORIES = [
    { value: 'account',       label: 'Account' },
    { value: 'bug',           label: 'Bug report' },
    { value: 'session',       label: 'Session problem' },
    { value: 'report_appeal', label: 'Report / deactivation appeal' },
    { value: 'feedback',      label: 'Feedback' },
    { value: 'other',         label: 'Other' },
]

export const PUBLIC_SUPPORT_CATEGORIES = SUPPORT_CATEGORIES.filter(function(c) {
    return ['account', 'report_appeal', 'other'].includes(c.value)
})

export const SUPPORT_STATUS = {
    open:        { label: 'Open',        bg: '#dbeafe', color: '#1d4ed8' },
    in_progress: { label: 'In progress', bg: '#fef3c7', color: '#92400e' },
    resolved:    { label: 'Resolved',    bg: '#dcfce7', color: '#166534' },
    closed:      { label: 'Closed',      bg: '#f1f5f9', color: '#475569' },
}

export const SUPPORT_PRIORITY = {
    low:    { label: 'Low',    bg: '#f1f5f9', color: '#475569' },
    normal: { label: 'Normal', bg: '#e0e7ff', color: '#4338ca' },
    high:   { label: 'High',   bg: '#fee2e2', color: '#991b1b' },
}

export const SUPPORT_SUBJECT_MAX = 120
export const SUPPORT_MESSAGE_MAX = 2000
export const SUPPORT_MESSAGE_MIN = 10

export const categoryLabel = function(value) {
    const match = SUPPORT_CATEGORIES.find(function(c) { return c.value === value })
    return match ? match.label : value
}
