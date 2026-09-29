// Mirrors REPORT_REASONS / REPORT_REASON_LABELS in backend/config/constants.js.
export const REPORT_REASONS = [
    { value: 'harassment',    label: 'Harassment' },
    { value: 'spam',          label: 'Spam' },
    { value: 'fake_profile',  label: 'Fake profile' },
    { value: 'scam',          label: 'Scam / fraud' },
    { value: 'inappropriate', label: 'Inappropriate content' },
    { value: 'other',         label: 'Other' },
]

export const REPORT_DESCRIPTION_MAX = 1000

export const reportReasonLabel = function(value) {
    const match = REPORT_REASONS.find(function(r) { return r.value === value })
    return match ? match.label : value
}
