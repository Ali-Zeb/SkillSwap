import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import AdminLayout from '../../components/layout/AdminLayout'
import { Users, UserPlus, CalendarDays, AlertTriangle, Star, ShieldCheck } from 'lucide-react'
import StatCard from '../../components/ui/StatCard'
import Spinner from '../../components/ui/Spinner'

const SESSION_LABELS = {
    pending_approval: 'Pending approval', scheduled: 'Scheduled', confirmed: 'Confirmed',
    completed: 'Completed', cancelled: 'Cancelled', rescheduled: 'Rescheduled',
}
const REPORT_LABELS = { pending: 'Pending', under_review: 'Under review', resolved: 'Resolved', dismissed: 'Dismissed' }

// Simple horizontal bar breakdown — no chart library needed.
const Breakdown = function({ title, counts, labels, color, link }) {
    const total = Object.values(counts).reduce(function(a, b) { return a + b }, 0)
    return (
        <div className="admin-card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.5rem' }}>
                <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{title}</h2>
                {link && <Link to={link} style={{ fontSize: '0.875rem', color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>View all →</Link>}
            </div>
            {total === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>No data yet.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {Object.entries(counts).map(function([key, count]) {
                        const pct = Math.round((count / total) * 100)
                        return (
                            <div key={key}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: '#334155', marginBottom: 4 }}>
                                    <span>{labels[key] || key}</span>
                                    <span style={{ fontWeight: 600 }}>{count} <span style={{ color: '#94a3b8', fontWeight: 400 }}>({pct}%)</span></span>
                                </div>
                                <div style={{ height: 8, background: '#f1f5f9', borderRadius: 4, overflow: 'hidden' }} aria-hidden="true">
                                    <div style={{ width: pct + '%', height: '100%', background: color, borderRadius: 4 }} />
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

const AdminDashboardPage = function() {
    const [stats,   setStats]   = useState(null)
    const [error,   setError]   = useState(null)

    useEffect(function() {
        api.get('/admin/stats')
            .then(function({ data }) { setStats(data.stats) })
            .catch(function(err) { setError(err.response?.data?.message || 'Failed to load statistics') })
    }, [])

    return (
        <AdminLayout title="Dashboard" subtitle="Platform overview">
            {error && <div role="alert" style={{ padding: '0.875rem 1rem', borderRadius: 10, background: '#fef2f2', color: '#b91c1c' }}>{error}</div>}
            {!error && !stats && <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><Spinner size="lg" /></div>}
            {stats && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <div className="admin-stat-grid">
                        <StatCard icon={Users} label="Total users" value={stats.users.total} sub={stats.users.active + ' active · ' + stats.users.inactive + ' deactivated'} />
                        <StatCard icon={UserPlus} label="New users (7 days)" value={stats.users.new7d} sub={stats.users.new30d + ' in the last 30 days'} color="success" />
                        <StatCard icon={CalendarDays} label="Sessions" value={stats.sessions.total} sub={stats.sessions.byStatus.completed + ' completed'} color="violet" />
                        <StatCard icon={AlertTriangle} label="Pending reports" value={stats.reports.byStatus.pending} sub={stats.reports.total + ' reports in total'} color={stats.reports.byStatus.pending > 0 ? 'error' : 'neutral'} />
                        <StatCard icon={Star} label="Average rating" value={stats.ratings.total ? stats.ratings.average.toFixed(1) : '—'} sub={stats.ratings.total + ' ratings'} color="warning" />
                        <StatCard icon={ShieldCheck} label="Admins" value={stats.users.admins} color="neutral" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', alignItems: 'start' }}>
                        <Breakdown title="Sessions by status" counts={stats.sessions.byStatus} labels={SESSION_LABELS} color="#2563eb" link="/admin/sessions" />
                        <Breakdown title="Reports by status" counts={stats.reports.byStatus} labels={REPORT_LABELS} color="#dc2626" link="/admin/reports" />
                    </div>
                </div>
            )}
        </AdminLayout>
    )
}

export default AdminDashboardPage
