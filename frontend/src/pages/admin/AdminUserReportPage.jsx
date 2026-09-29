import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { GraduationCap, BookOpen, CalendarCheck, CalendarX, Star, Award, Flag, Download, Printer } from 'lucide-react'
import api from '../../api/axios'
import AdminLayout from '../../components/layout/AdminLayout'
import StatCard from '../../components/ui/StatCard'
import Spinner from '../../components/ui/Spinner'
import PrintHeader from '../../components/ui/PrintHeader'
import { downloadFile } from '../../utils/download'
import { reportReasonLabel } from '../../utils/reportOptions'
import { getAvatarUrl, formatDate, timeAgo } from '../../utils/helpers'

const REPORT_STATUS = {
    pending:      { label: 'Pending',      bg: '#fef3c7', color: '#92400e' },
    under_review: { label: 'Under review', bg: '#dbeafe', color: '#1d4ed8' },
    resolved:     { label: 'Resolved',     bg: '#dcfce7', color: '#166534' },
    dismissed:    { label: 'Dismissed',    bg: '#f1f5f9', color: '#475569' },
}

const AdminUserReportPage = function() {
    const { id } = useParams()
    const [state, setState] = useState({ id: null, report: null, error: null })
    const [exporting, setExporting] = useState(false)
    const [exportError, setExportError] = useState(null)

    useEffect(function() {
        let cancelled = false
        api.get('/admin/analytics/users/' + id)
            .then(function({ data }) { if (!cancelled) setState({ id: id, report: data.report, error: null }) })
            .catch(function(err) { if (!cancelled) setState({ id: id, report: null, error: err.response?.data?.message || 'Could not load this report' }) })
        return function() { cancelled = true }
    }, [id])
    const loading = state.id !== id
    const r = state.report

    const exportCsv = async function() {
        setExporting(true)
        setExportError(null)
        try { await downloadFile('/admin/analytics/users/' + id + '/export', {}, 'skillswap-member-report.csv') }
        catch (err) { setExportError(err.message) }
        finally { setExporting(false) }
    }

    const actions = (
        <div className="no-print" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link to="/admin/users" className="admin-btn">← Users</Link>
            <button type="button" className="admin-btn" onClick={exportCsv} disabled={exporting || !r}><Download size={15} aria-hidden="true" /> {exporting ? 'Exporting...' : 'Export CSV'}</button>
            <button type="button" className="admin-btn admin-btn--primary" onClick={function() { window.print() }} disabled={!r}><Printer size={15} aria-hidden="true" /> Download PDF</button>
        </div>
    )

    return (
        <AdminLayout title="Member report" subtitle={r ? r.user.fullName : ''} actions={actions}>
            {r && <PrintHeader title={'Member report — ' + r.user.fullName} subtitle={r.user.email} generatedAt={r.generatedAt} />}
            {(state.error || exportError) && <div role="alert" style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', marginBottom: '1rem' }}>{state.error || exportError}</div>}
            {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><Spinner size="lg" /></div>}

            {!loading && r && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="admin-card" style={{ padding: '1.25rem', display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                        <img src={getAvatarUrl(r.user.avatar, r.user.fullName)} alt="" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                        <div style={{ flex: 1, minWidth: 200 }}>
                            <div style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#0f172a' }}>{r.user.fullName}</div>
                            <div style={{ fontSize: '0.875rem', color: '#475569', overflowWrap: 'anywhere' }}>{r.user.email}</div>
                            <div style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 2 }}>
                                Joined {formatDate(r.user.joinedAt)} · Last active {r.user.lastActive ? timeAgo(r.user.lastActive) : '—'}
                            </div>
                        </div>
                        <span className="admin-badge" style={r.user.isActive ? { background: '#dcfce7', color: '#166534' } : { background: '#fee2e2', color: '#991b1b' }}>
                            {r.user.isActive ? 'Active' : 'Deactivated'}
                        </span>
                        {!r.user.isActive && r.user.deactivationReason && <p style={{ flexBasis: '100%', margin: 0, fontSize: '0.8125rem', color: '#991b1b' }}>Reason: {r.user.deactivationReason}</p>}
                    </div>

                    <div className="admin-stat-grid">
                        <StatCard icon={GraduationCap} label="Sessions taught" value={r.sessions.taught} />
                        <StatCard icon={BookOpen} label="Sessions learned" value={r.sessions.learned} color="violet" />
                        <StatCard icon={CalendarCheck} label="Completed" value={r.sessions.completed} sub={r.sessions.upcomingOrPending + ' upcoming / pending'} color="success" />
                        <StatCard icon={CalendarX} label="Cancelled" value={r.sessions.cancelled} color="neutral" />
                        <StatCard icon={Star} label="Ratings received" value={r.ratings.count ? r.ratings.average.toFixed(1) : '—'} sub={r.ratings.count + ' ratings · reputation ' + (r.user.reputation || 0).toFixed(1)} color="warning" />
                        <StatCard icon={Award} label="Badges" value={r.badges.length} sub="of 7" color="primary" />
                        <StatCard icon={Flag} label="Reports against" value={r.reports.total} sub={(r.reports.byStatus.pending || 0) + ' pending'} color={r.reports.total > 0 ? 'error' : 'neutral'} />
                    </div>

                    <div className="admin-analytics-grid">
                        <div className="admin-card" style={{ padding: '1.125rem 1.25rem' }}>
                            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 0.75rem' }}>Skills</h2>
                            <p style={{ margin: '0 0 0.375rem', fontSize: '0.875rem' }}><strong>Teaches:</strong> {r.user.teaches.join(', ') || '—'}</p>
                            <p style={{ margin: 0, fontSize: '0.875rem' }}><strong>Wants to learn:</strong> {r.user.learns.join(', ') || '—'}</p>
                        </div>
                        <div className="admin-card" style={{ padding: '1.125rem 1.25rem' }}>
                            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 0.75rem' }}>Badges earned</h2>
                            {r.badges.length === 0 ? <p style={{ margin: 0, fontSize: '0.875rem', color: '#94a3b8' }}>No badges yet.</p> : (
                                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                                    {r.badges.map(function(b) { return <li key={b.type} style={{ fontSize: '0.875rem', display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}><span>{b.label}</span><span style={{ color: '#64748b' }}>{formatDate(b.earnedAt)}</span></li> })}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="admin-card">
                        <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, padding: '1rem 1.25rem' }}>Reports filed against this member</h2>
                        {r.reports.items.length === 0 ? (
                            <p style={{ color: '#94a3b8', margin: 0, padding: '0 1.25rem 1.25rem', fontSize: '0.875rem' }}>No reports.</p>
                        ) : (
                            <div className="admin-table-wrap">
                                <table className="admin-table">
                                    <thead><tr><th>Date</th><th>Reason</th><th>About</th><th>Status</th><th>Resolution note</th></tr></thead>
                                    <tbody>
                                        {r.reports.items.map(function(x) {
                                            const s = REPORT_STATUS[x.status] || REPORT_STATUS.pending
                                            return (
                                                <tr key={x._id}>
                                                    <td data-label="Date" style={{ whiteSpace: 'nowrap' }}>{formatDate(x.createdAt)}</td>
                                                    <td data-label="Reason">{reportReasonLabel(x.reason)}</td>
                                                    <td data-label="About">{x.targetType}</td>
                                                    <td data-label="Status"><span className="admin-badge" style={{ background: s.bg, color: s.color }}>{s.label}</span></td>
                                                    <td data-label="Resolution note" style={{ overflowWrap: 'anywhere' }}>{x.resolutionNote || '—'}</td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </AdminLayout>
    )
}

export default AdminUserReportPage
