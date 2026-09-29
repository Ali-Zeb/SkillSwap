import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import { REPORT_REASONS, REPORT_DESCRIPTION_MAX as DESCRIPTION_MAX } from '../../utils/reportOptions'

// The dialog body is mounted fresh every time the modal opens, so its
// form state always starts empty without a reset effect.
const ReportDialog = function({ onClose, reportedUser, targetType, targetId }) {
    const [reason,      setReason]      = useState('')
    const [description, setDescription] = useState('')
    const [submitting,  setSubmitting]  = useState(false)
    const [error,       setError]       = useState(null)
    const [submitted,   setSubmitted]   = useState(false)

    useEffect(function() {
        const onKey = function(e) { if (e.key === 'Escape' && !submitting) onClose() }
        window.addEventListener('keydown', onKey)
        return function() { window.removeEventListener('keydown', onKey) }
    }, [submitting, onClose])

    const descriptionRequired = reason === 'other'

    const handleSubmit = async function(e) {
        e.preventDefault()
        setError(null)
        if (!reason) { setError('Please choose a reason'); return }
        if (descriptionRequired && !description.trim()) { setError('Please describe the problem when choosing "Other"'); return }

        setSubmitting(true)
        try {
            const payload = { reportedUser: reportedUser._id, reason, targetType, description: description.trim() }
            if (targetType !== 'user' && targetId) payload.targetId = targetId
            await api.post('/reports', payload)
            setSubmitted(true)
        } catch (err) {
            setError(err.response?.data?.message || 'Could not submit the report. Please try again.')
        } finally {
            setSubmitting(false)
        }
    }

    const labelStyle = { display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.9375rem' }
    const fieldStyle = { width: '100%', padding: '0.75rem 1rem', border: '2px solid #e2e8f0', borderRadius: 8, fontSize: '0.9375rem', color: '#1e293b', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', background: 'white' }

    return (
        <div
            role="presentation"
            onClick={function() { if (!submitting) onClose() }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}
        >
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="report-modal-title"
                onClick={function(e) { e.stopPropagation() }}
                style={{ width: '100%', maxWidth: 480, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', background: 'white', borderRadius: 14, boxShadow: '0 20px 50px rgba(0,0,0,0.25)', padding: '1.5rem', boxSizing: 'border-box', color: '#1e293b', textAlign: 'left' }}
            >
                {submitted ? (
                    <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
                        <h2 id="report-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem' }}>Report submitted</h2>
                        <p style={{ color: '#64748b', fontSize: '0.9375rem', margin: '0 0 1.25rem' }}>
                            Thank you. Our team will review it. You can follow its status in My reports.
                        </p>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <Link to="/reports" onClick={onClose} style={{ padding: '0.625rem 1.25rem', borderRadius: 8, border: '1.5px solid #e2e8f0', color: '#1e293b', textDecoration: 'none', fontWeight: 500 }}>
                                My reports
                            </Link>
                            <button type="button" onClick={onClose} style={{ padding: '0.625rem 1.25rem', borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer' }}>
                                Done
                            </button>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} noValidate>
                        <h2 id="report-modal-title" style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
                            Report {reportedUser.fullName || 'user'}
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1.25rem' }}>
                            Reports are confidential. The user will not see who reported them.
                        </p>

                        <label htmlFor="report-reason" style={labelStyle}>Reason</label>
                        <select
                            id="report-reason"
                            value={reason}
                            onChange={function(e) { setReason(e.target.value) }}
                            style={{ ...fieldStyle, marginBottom: '1rem' }}
                        >
                            <option value="">Choose a reason</option>
                            {REPORT_REASONS.map(function(r) { return <option key={r.value} value={r.value}>{r.label}</option> })}
                        </select>

                        <label htmlFor="report-description" style={labelStyle}>
                            Details {descriptionRequired
                                ? <span style={{ color: '#dc2626' }}>*</span>
                                : <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span>}
                        </label>
                        <textarea
                            id="report-description"
                            value={description}
                            maxLength={DESCRIPTION_MAX}
                            rows={4}
                            onChange={function(e) { setDescription(e.target.value) }}
                            placeholder="What happened?"
                            style={{ ...fieldStyle, resize: 'vertical' }}
                        />
                        <div style={{ textAlign: 'right', fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                            {description.length}/{DESCRIPTION_MAX}
                        </div>

                        {error && (
                            <div role="alert" style={{ marginTop: '0.75rem', padding: '0.625rem 0.875rem', borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: '0.875rem' }}>
                                {error}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                            <button type="button" onClick={onClose} disabled={submitting} style={{ padding: '0.625rem 1.25rem', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', color: '#1e293b', fontWeight: 500, cursor: 'pointer' }}>
                                Cancel
                            </button>
                            <button type="submit" disabled={submitting} style={{ padding: '0.625rem 1.25rem', borderRadius: 8, border: 'none', background: '#dc2626', color: 'white', fontWeight: 600, cursor: submitting ? 'default' : 'pointer', opacity: submitting ? 0.7 : 1 }}>
                                {submitting ? 'Submitting...' : 'Submit report'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    )
}

/**
 * Reusable "Report user" dialog.
 *
 * Props:
 *   isOpen, onClose
 *   reportedUser: { _id, fullName }
 *   targetType:   'user' | 'session' | 'message'   (default 'user')
 *   targetId:     id of the session/message when targetType isn't 'user'
 */
const ReportModal = function({ isOpen, onClose, reportedUser, targetType = 'user', targetId }) {
    if (!isOpen || !reportedUser) return null
    return <ReportDialog onClose={onClose} reportedUser={reportedUser} targetType={targetType} targetId={targetId} />
}

export default ReportModal
