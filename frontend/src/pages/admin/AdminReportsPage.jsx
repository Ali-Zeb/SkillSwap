import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import AdminLayout from '../../components/layout/AdminLayout'
import Pagination from '../../components/ui/Pagination'
import Spinner from '../../components/ui/Spinner'
import useAdminList from '../../hooks/useAdminList'
import { reportReasonLabel } from '../../utils/reportOptions'
import { formatDateTime } from '../../utils/helpers'

const STATUS = {
    pending:      { label: 'Pending',      bg: '#fef3c7', color: '#92400e' },
    under_review: { label: 'Under review', bg: '#dbeafe', color: '#1d4ed8' },
    resolved:     { label: 'Resolved',     bg: '#dcfce7', color: '#166534' },
    dismissed:    { label: 'Dismissed',    bg: '#f1f5f9', color: '#475569' },
}

const ReviewDialog = function({ report, onCancel, onSaved }) {
    const [status,         setStatus]         = useState(report.status === 'pending' ? 'under_review' : report.status)
    const [note,           setNote]           = useState(report.resolutionNote || '')
    const [deactivateUser, setDeactivateUser] = useState(false)
    const [busy,           setBusy]           = useState(false)
    const [error,          setError]          = useState(null)
    const target = report.reportedUser
    const canDeactivate = status === 'resolved' && target?.isActive

    const save = async function(e) {
        e.preventDefault()
        setBusy(true)
        setError(null)
        try {
            const { data } = await api.patch('/admin/reports/' + report._id, {
                status, resolutionNote: note.trim(), deactivateUser: canDeactivate && deactivateUser
            })
            onSaved(data.report)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update report')
            setBusy(false)
        }
    }

    return (
        <div role="presentation" onClick={busy ? undefined : onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
            <form role="dialog" aria-modal="true" aria-labelledby="review-title" onClick={function(e) { e.stopPropagation() }} onSubmit={save}
                style={{ width: '100%', maxWidth: 520, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', background: 'white', borderRadius: 14, padding: '1.5rem', boxSizing: 'border-box', color: '#1e293b' }}>
                <h2 id="review-title" style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.75rem' }}>Review report</h2>
                <dl style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '0.375rem 0.75rem', fontSize: '0.9rem', margin: '0 0 1rem' }}>
                    <dt style={{ color: '#64748b' }}>Reported</dt><dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{target ? target.fullName + ' (' + target.email + ')' : 'Deleted user'}</dd>
                    <dt style={{ color: '#64748b' }}>By</dt><dd style={{ margin: 0, overflowWrap: 'anywhere' }}>{report.reporter ? report.reporter.fullName : 'Deleted user'}</dd>
                    <dt style={{ color: '#64748b' }}>Reason</dt><dd style={{ margin: 0 }}>{reportReasonLabel(report.reason)} · {report.targetType}</dd>
                </dl>
                {report.description && (
                    <p style={{ background: '#f8fafc', borderRadius: 8, padding: '0.75rem', fontSize: '0.9rem', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', margin: '0 0 1rem' }}>{report.description}</p>
                )}

                <label htmlFor="review-status" style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>Status</label>
                <select id="review-status" value={status} onChange={function(e) { setStatus(e.target.value) }}
                    style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9375rem', marginBottom: '0.875rem', background: 'white' }}>
                    {Object.entries(STATUS).map(function([value, s]) { return <option key={value} value={value}>{s.label}</option> })}
                </select>

                <label htmlFor="review-note" style={{ display: 'block', fontWeight: 500, marginBottom: 6 }}>
                    Resolution note <span style={{ color: '#64748b', fontWeight: 400 }}>(visible to the reporter)</span>
                </label>
                <textarea id="review-note" value={note} maxLength={1000} rows={3} onChange={function(e) { setNote(e.target.value) }}
                    style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.9375rem', boxSizing: 'border-box', resize: 'vertical' }} />

                {canDeactivate && (
                    <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', marginTop: '0.875rem', fontSize: '0.9rem', color: '#991b1b' }}>
                        <input type="checkbox" checked={deactivateUser} onChange={function(e) { setDeactivateUser(e.target.checked) }} style={{ marginTop: 3 }} />
                        Also deactivate {target.fullName}'s account (the note is used as the reason)
                    </label>
                )}

                {error && <p role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', margin: '0.75rem 0 0' }}>{error}</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                    <button type="button" className="admin-btn" onClick={onCancel} disabled={busy}>Cancel</button>
                    <button type="submit" className="admin-btn admin-btn--primary" disabled={busy}>{busy ? 'Saving...' : 'Save'}</button>
                </div>
            </form>
        </div>
    )
}

const AdminReportsPage = function() {
    const [status,   setStatus]   = useState('pending')
    const [page,     setPage]     = useState(1)
    const [selected, setSelected] = useState(null)

    const { items: reports, setItems, pagination, loading, error, reload } =
        useAdminList('/admin/reports', { status, page, limit: 20 })

    const onSaved = function(updated) {
        setSelected(null)
        // Leaves the current filter when its status changed — refetch for accurate paging.
        if (status && updated.status !== status) reload()
        else setItems(function(list) { return list.map(function(r) { return r._id === updated._id ? updated : r }) })
    }

    return (
        <AdminLayout title="Reports" subtitle="Review user reports and take action">
            <div className="admin-filters">
                <select aria-label="Filter by status" value={status} onChange={function(e) { setStatus(e.target.value); setPage(1) }}>
                    <option value="">All statuses</option>
                    {Object.entries(STATUS).map(function([value, s]) { return <option key={value} value={value}>{s.label}</option> })}
                </select>
            </div>

            {error && <div role="alert" style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', marginBottom: '1rem' }}>{error}</div>}

            <div className="admin-card">
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><Spinner size="lg" /></div>
                ) : reports.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '2.5rem 1rem', margin: 0 }}>
                        {status ? 'No ' + STATUS[status].label.toLowerCase() + ' reports.' : 'No reports yet.'}
                    </p>
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr><th>Reported user</th><th>Reason</th><th>Reporter</th><th>Status</th><th>Filed</th><th></th></tr>
                            </thead>
                            <tbody>
                                {reports.map(function(r) {
                                    const s = STATUS[r.status] || STATUS.pending
                                    return (
                                        <tr key={r._id}>
                                            <td data-label="Reported user">
                                                {r.reportedUser ? (
                                                    <>
                                                        <Link to={'/profile/' + r.reportedUser._id} style={{ fontWeight: 600, color: '#1e293b', textDecoration: 'none' }}>{r.reportedUser.fullName}</Link>
                                                        {!r.reportedUser.isActive && <span className="admin-badge" style={{ background: '#fee2e2', color: '#991b1b', marginLeft: 6 }}>Deactivated</span>}
                                                    </>
                                                ) : <span style={{ color: '#94a3b8' }}>Deleted user</span>}
                                            </td>
                                            <td data-label="Reason">
                                                {reportReasonLabel(r.reason)}
                                                {r.description && <div style={{ fontSize: '0.8125rem', color: '#64748b', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.description}</div>}
                                            </td>
                                            <td data-label="Reporter">{r.reporter?.fullName || <span style={{ color: '#94a3b8' }}>Deleted user</span>}</td>
                                            <td data-label="Status"><span className="admin-badge" style={{ background: s.bg, color: s.color }}>{s.label}</span></td>
                                            <td data-label="Filed">{formatDateTime(r.createdAt)}</td>
                                            <td data-label="Action">
                                                <button type="button" className="admin-btn" onClick={function() { setSelected(r) }}>Review</button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Pagination pagination={pagination} onPageChange={setPage} disabled={loading} />

            {selected && <ReviewDialog report={selected} onCancel={function() { setSelected(null) }} onSaved={onSaved} />}
        </AdminLayout>
    )
}

export default AdminReportsPage
