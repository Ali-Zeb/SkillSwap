import { useState } from 'react'
import AdminLayout from '../../components/layout/AdminLayout'
import Pagination from '../../components/ui/Pagination'
import Spinner from '../../components/ui/Spinner'
import useAdminList from '../../hooks/useAdminList'
import { formatDateTime } from '../../utils/helpers'

const ACTION_LABELS = {
    user_deactivated: { label: 'Deactivated user', bg: '#fee2e2', color: '#991b1b' },
    user_activated:   { label: 'Reactivated user', bg: '#dcfce7', color: '#166534' },
    role_changed:     { label: 'Changed role',     bg: '#ede9fe', color: '#6d28d9' },
    report_updated:   { label: 'Updated report',   bg: '#dbeafe', color: '#1d4ed8' },
}

const describe = function(log) {
    const m = log.metadata || {}
    switch (log.action) {
        case 'user_deactivated': return (m.userName || 'User') + (m.reason ? ' — ' + m.reason : '')
        case 'user_activated':   return m.userName || 'User'
        case 'role_changed':     return (m.userName || 'User') + ': ' + m.from + ' → ' + m.to
        case 'report_updated':   return m.from + ' → ' + m.to + (m.userDeactivated ? ' (user deactivated)' : '') + (m.resolutionNote ? ' — ' + m.resolutionNote : '')
        default:                 return ''
    }
}

const AdminAuditLogPage = function() {
    const [page, setPage] = useState(1)
    const { items: logs, pagination, loading, error } = useAdminList('/admin/audit-logs', { page, limit: 30 })

    return (
        <AdminLayout title="Audit Log" subtitle="Every admin action, newest first">
            {error && <div role="alert" style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', marginBottom: '1rem' }}>{error}</div>}

            <div className="admin-card">
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><Spinner size="lg" /></div>
                ) : logs.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '2.5rem 1rem', margin: 0 }}>No admin actions recorded yet.</p>
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr><th>When</th><th>Admin</th><th>Action</th><th>Details</th></tr>
                            </thead>
                            <tbody>
                                {logs.map(function(log) {
                                    const a = ACTION_LABELS[log.action] || { label: log.action, bg: '#f1f5f9', color: '#475569' }
                                    return (
                                        <tr key={log._id}>
                                            <td data-label="When" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(log.createdAt)}</td>
                                            <td data-label="Admin">{log.actor?.fullName || <span style={{ color: '#94a3b8' }}>Deleted user</span>}</td>
                                            <td data-label="Action"><span className="admin-badge" style={{ background: a.bg, color: a.color }}>{a.label}</span></td>
                                            <td data-label="Details" style={{ overflowWrap: 'anywhere' }}>{describe(log)}</td>
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

export default AdminAuditLogPage
