import { useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import Pagination from '../../components/ui/Pagination'
import Spinner from '../../components/ui/Spinner'
import useAdminList from '../../hooks/useAdminList'
import { formatDateTime } from '../../utils/helpers'

const STATUS = {
    pending_approval: { label: 'Pending approval', bg: '#fef3c7', color: '#92400e' },
    scheduled:        { label: 'Scheduled',        bg: '#dbeafe', color: '#1d4ed8' },
    confirmed:        { label: 'Confirmed',        bg: '#e0e7ff', color: '#4338ca' },
    completed:        { label: 'Completed',        bg: '#dcfce7', color: '#166534' },
    cancelled:        { label: 'Cancelled',        bg: '#fee2e2', color: '#991b1b' },
    rescheduled:      { label: 'Rescheduled',      bg: '#fef3c7', color: '#92400e' },
}

const AdminSessionsPage = function() {
    const [status, setStatus] = useState('')
    const [page,   setPage]   = useState(1)
    const { items: sessions, pagination, loading, error } = useAdminList('/admin/sessions', { status, page, limit: 20 })

    return (
        <AdminLayout title="Sessions" subtitle="All sessions on the platform">
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
                ) : sessions.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '2.5rem 1rem', margin: 0 }}>No sessions found.</p>
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr><th>Title</th><th>Teacher</th><th>Learner</th><th>Skill</th><th>Date</th><th>Status</th></tr>
                            </thead>
                            <tbody>
                                {sessions.map(function(s) {
                                    const st = STATUS[s.status] || STATUS.scheduled
                                    return (
                                        <tr key={s._id}>
                                            <td data-label="Title" style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{s.title}</td>
                                            <td data-label="Teacher">{s.teacherId?.fullName || <span style={{ color: '#94a3b8' }}>Deleted user</span>}</td>
                                            <td data-label="Learner">{s.learnerId?.fullName || <span style={{ color: '#94a3b8' }}>Deleted user</span>}</td>
                                            <td data-label="Skill">{s.skillId?.name || '—'}</td>
                                            <td data-label="Date">{formatDateTime(s.date)} · {s.duration} min</td>
                                            <td data-label="Status"><span className="admin-badge" style={{ background: st.bg, color: st.color }}>{st.label}</span></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Pagination pagination={pagination} onPageChange={setPage} disabled={loading} />
        </AdminLayout>
    )
}

export default AdminSessionsPage
