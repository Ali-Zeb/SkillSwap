import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Users, CalendarCheck, CalendarX, Percent, Star, Flag, LifeBuoy, Timer, Download, Printer } from 'lucide-react'
import api from '../../api/axios'
import AdminLayout from '../../components/layout/AdminLayout'
import StatCard from '../../components/ui/StatCard'
import Spinner from '../../components/ui/Spinner'
import TrendChart from '../../components/ui/TrendChart'
import PrintHeader from '../../components/ui/PrintHeader'
import { downloadFile } from '../../utils/download'

const RANGES = [
    { key: '7d',  label: '7 days' },
    { key: '30d', label: '30 days' },
    { key: '90d', label: '90 days' },
    { key: 'custom', label: 'Custom' },
]

const isoDay = function(d) { return d.toISOString().slice(0, 10) }
const longDay = function(iso) { return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) }

// Horizontal bar list for top skills.
const RankList = function({ title, rows, color, empty }) {
    const max = Math.max(1, ...rows.map(function(r) { return r.members }))
    return (
        <div className="admin-card" style={{ padding: '1.125rem 1.25rem' }}>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: '0 0 0.875rem', color: '#0f172a' }}>{title}</h2>
            {rows.length === 0 ? <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.875rem' }}>{empty}</p> : (
                <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                    {rows.map(function(r, i) {
                        return (
                            <li key={r.skillId || i}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.8125rem', color: '#334155', marginBottom: 3 }}>
                                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i + 1}. {r.name}</span>
                                    <span style={{ fontWeight: 600, flexShrink: 0 }}>{r.members}</span>
                                </div>
                                <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3 }}>
                                    <div style={{ width: (r.members / max * 100) + '%', height: '100%', background: color, borderRadius: 3 }} />
                                </div>
                            </li>
                        )
                    })}
                </ol>
            )}
        </div>
    )
}

const AdminAnalyticsPage = function() {
    // Lazy initialisers: the current date is read once, not on every render.
    const [today]  = useState(function() { return isoDay(new Date()) })
    const [range,  setRange]  = useState('30d')
    const [custom, setCustom] = useState(function() {
        const now = new Date()
        return { from: isoDay(new Date(now.getTime() - 29 * 864e5)), to: isoDay(now) }
    })
    const [applied, setApplied] = useState({ range: '30d' })
    const [state,  setState]  = useState({ key: null, report: null, error: null })
    const [exporting, setExporting] = useState(false)
    const [exportError, setExportError] = useState(null)

    const requestKey = JSON.stringify(applied)
    useEffect(function() {
        let cancelled = false
        api.get('/admin/analytics/platform', { params: JSON.parse(requestKey) })
            .then(function({ data }) { if (!cancelled) setState({ key: requestKey, report: data.report, error: null }) })
            .catch(function(err) { if (!cancelled) setState({ key: requestKey, report: null, error: err.response?.data?.message || 'Could not load analytics' }) })
        return function() { cancelled = true }
    }, [requestKey])
    const loading = state.key !== requestKey
    const r = state.report

    const pickRange = function(key) {
        setRange(key)
        if (key !== 'custom') setApplied({ range: key })
    }
    const applyCustom = function(e) {
        e.preventDefault()
        setApplied({ range: 'custom', from: custom.from, to: custom.to })
    }
    const exportCsv = async function() {
        setExporting(true)
        setExportError(null)
        try { await downloadFile('/admin/analytics/platform/export', applied, 'skillswap-platform-report.csv') }
        catch (err) { setExportError(err.message) }
        finally { setExporting(false) }
    }

    const actions = (
        <div className="no-print" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="admin-btn" onClick={exportCsv} disabled={exporting || loading || !r}><Download size={15} aria-hidden="true" /> {exporting ? 'Exporting...' : 'Export CSV'}</button>
            <button type="button" className="admin-btn admin-btn--primary" onClick={function() { window.print() }} disabled={loading || !r}><Printer size={15} aria-hidden="true" /> Download PDF</button>
        </div>
    )

    return (
        <AdminLayout title="Analytics" subtitle="Platform activity for a date range — admin accounts excluded" actions={actions}>
            {r && <PrintHeader title="Platform report" subtitle={longDay(r.range.from) + ' – ' + longDay(r.range.to) + ' (' + r.range.days + ' days)'} generatedAt={r.generatedAt} />}

            <div className="no-print admin-range-bar">
                <div className="admin-segmented" role="group" aria-label="Date range">
                    {RANGES.map(function(opt) {
                        return <button key={opt.key} type="button" aria-pressed={range === opt.key} className={range === opt.key ? 'is-active' : ''} onClick={function() { pickRange(opt.key) }}>{opt.label}</button>
                    })}
                </div>
                {range === 'custom' && (
                    <form onSubmit={applyCustom} className="admin-filters" style={{ margin: 0 }}>
                        <input type="date" aria-label="From" value={custom.from} max={custom.to} onChange={function(e) { setCustom({ ...custom, from: e.target.value }) }} style={{ flex: '0 1 auto' }} />
                        <input type="date" aria-label="To" value={custom.to} min={custom.from} max={today} onChange={function(e) { setCustom({ ...custom, to: e.target.value }) }} style={{ flex: '0 1 auto' }} />
                        <button type="submit" className="admin-btn">Apply</button>
                    </form>
                )}
            </div>

            {(state.error || exportError) && <div role="alert" style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', marginBottom: '1rem' }}>{state.error || exportError}</div>}
            {loading && <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><Spinner size="lg" /></div>}

            {!loading && r && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <p className="no-print" style={{ margin: 0, color: '#64748b', fontSize: '0.875rem' }}>
                        {longDay(r.range.from)} – {longDay(r.range.to)} · {r.range.days} days
                    </p>
                    <div className="admin-stat-grid">
                        <StatCard icon={Users} label="New members" value={r.users.new} />
                        <StatCard icon={CalendarCheck} label="Sessions completed" value={r.sessions.completed} sub={r.sessions.created + ' created in range'} color="success" />
                        <StatCard icon={CalendarX} label="Sessions cancelled" value={r.sessions.cancelled} color="neutral" />
                        <StatCard icon={Percent} label="Completion rate" value={r.sessions.completionRate === null ? '—' : r.sessions.completionRate + '%'} sub="completed ÷ (completed + cancelled)" color="violet" />
                        <StatCard icon={Star} label="Average rating" value={r.ratings.count ? r.ratings.average.toFixed(1) : '—'} sub={r.ratings.count + ' ratings'} color="warning" />
                        <StatCard icon={Flag} label="Complaints" value={r.complaints.received} sub={r.complaints.resolved + ' resolved'} color={r.complaints.received > 0 ? 'error' : 'neutral'} />
                        <StatCard icon={LifeBuoy} label="Support tickets open" value={r.support.open} sub={r.support.created + ' new · ' + r.support.resolved + ' resolved'} />
                        <StatCard icon={Timer} label="Avg first response" value={r.support.avgFirstResponseHours === null ? '—' : r.support.avgFirstResponseHours + ' h'} sub="support tickets in range" color="success" />
                    </div>

                    <div className="admin-analytics-grid">
                        <TrendChart title="New members & sessions per day" series={[
                            { label: 'New members', color: '#2563eb', points: r.trends.newUsers },
                            { label: 'Sessions created', color: '#7c3aed', points: r.trends.sessionsCreated },
                        ]} />
                        <TrendChart title="Complaints per day" series={[{ label: 'Complaints', color: '#dc2626', points: r.trends.complaints }]} />
                    </div>

                    <div className="admin-analytics-grid">
                        <RankList title="Top skills taught" rows={r.topSkills.taught} color="#2563eb" empty="No teaching skills on profiles yet." />
                        <RankList title="Top skills requested" rows={r.topSkills.requested} color="#7c3aed" empty="No learning goals on profiles yet." />
                    </div>

                    <div className="admin-card">
                        <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0, padding: '1rem 1.25rem', color: '#0f172a' }}>Top teachers</h2>
                        {r.topTeachers.length === 0 ? (
                            <p style={{ color: '#94a3b8', margin: 0, padding: '0 1.25rem 1.25rem', fontSize: '0.875rem' }}>No completed sessions in this range.</p>
                        ) : (
                            <div className="admin-table-wrap">
                                <table className="admin-table">
                                    <thead><tr><th>#</th><th>Teacher</th><th>Completed sessions</th><th>Average rating</th><th className="no-print"></th></tr></thead>
                                    <tbody>
                                        {r.topTeachers.map(function(t, i) {
                                            return (
                                                <tr key={t.userId}>
                                                    <td data-label="#">{i + 1}</td>
                                                    <td data-label="Teacher" style={{ fontWeight: 600 }}>{t.fullName}</td>
                                                    <td data-label="Completed sessions">{t.completed}</td>
                                                    <td data-label="Average rating">{t.ratingsCount ? t.averageRating.toFixed(1) + ' (' + t.ratingsCount + ')' : '—'}</td>
                                                    <td className="no-print" data-label="Report"><Link to={'/admin/users/' + t.userId + '/report'} className="admin-btn admin-btn--sm">View report</Link></td>
                                                </tr>
                                            )
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                        Completion rate: {r.definitions.completionRate}. Top skills: {r.definitions.topSkills}. Top teachers: {r.definitions.topTeachers}.
                    </p>
                </div>
            )}
        </AdminLayout>
    )
}

export default AdminAnalyticsPage
