import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { reportReasonLabel as reasonLabel } from '../utils/reportOptions'
import { formatDate, getAvatarUrl } from '../utils/helpers'

const STATUS_STYLES = {
    pending:      { label: 'Pending',      bg: '#fef3c7', color: '#92400e' },
    under_review: { label: 'Under review', bg: '#dbeafe', color: '#1d4ed8' },
    resolved:     { label: 'Resolved',     bg: '#dcfce7', color: '#166534' },
    dismissed:    { label: 'Dismissed',    bg: '#f1f5f9', color: '#475569' },
}

const TARGET_LABELS = { user: 'Profile', session: 'Session', message: 'Message' }

const MyReportsPage = function() {
    const [reports, setReports] = useState([])
    const [loading, setLoading] = useState(true)
    const [error,   setError]   = useState(null)

    useEffect(function() {
        const load = async function() {
            try {
                const { data } = await api.get('/reports/mine')
                setReports(data.reports || [])
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load your reports')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])

    if (loading) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <Spinner size="lg" />
                    <p style={{ color: '#64748b', marginTop: '0.75rem' }}>Loading your reports...</p>
                </div>
            </div>
        )
    }

    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', padding: '2rem 1.25rem' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>
                <div style={{ marginBottom: '1.75rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>My reports</h1>
                    <p style={{ color: '#64748b', marginTop: 4 }}>Reports you have submitted and their current status.</p>
                </div>

                {error && (
                    <div role="alert" style={{ padding: '0.875rem 1rem', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', marginBottom: '1rem' }}>
                        {error}
                    </div>
                )}

                {!error && reports.length === 0 ? (
                    <div style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                        <EmptyState
                            icon="🛡️"
                            title="No reports yet"
                            message="If someone behaves inappropriately, use “Report user” on their profile, in chat, or in a session."
                        />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                        {reports.map(function(report) {
                            const status = STATUS_STYLES[report.status] || STATUS_STYLES.pending
                            const user   = report.reportedUser
                            const name   = user?.fullName || 'Deleted user'
                            return (
                                <div key={report._id} style={{ background: 'white', borderRadius: 12, padding: '1rem 1.25rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        <img src={getAvatarUrl(user?.avatar, name)} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            {user ? (
                                                <Link to={'/profile/' + user._id} style={{ fontWeight: 600, color: '#1e293b', textDecoration: 'none' }}>{name}</Link>
                                            ) : (
                                                <span style={{ fontWeight: 600, color: '#64748b' }}>{name}</span>
                                            )}
                                            <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                                                {reasonLabel(report.reason) + ' · ' + (TARGET_LABELS[report.targetType] || 'Profile') + ' · ' + formatDate(report.createdAt)}
                                            </div>
                                        </div>
                                        <span style={{ padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: status.bg, color: status.color, whiteSpace: 'nowrap' }}>
                                            {status.label}
                                        </span>
                                    </div>
                                    {report.description && (
                                        <p style={{ margin: '0.75rem 0 0', color: '#334155', fontSize: '0.9rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{report.description}</p>
                                    )}
                                    {report.resolutionNote && (
                                        <div style={{ marginTop: '0.75rem', padding: '0.625rem 0.875rem', borderRadius: 8, background: '#f8fafc', fontSize: '0.875rem', color: '#334155', overflowWrap: 'anywhere' }}>
                                            <strong>Team response: </strong>{report.resolutionNote}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default MyReportsPage
