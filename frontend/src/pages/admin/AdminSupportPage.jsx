import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MessageSquareReply } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import Pagination from '../../components/ui/Pagination'
import Spinner from '../../components/ui/Spinner'
import useAdminList from '../../hooks/useAdminList'
import { formatDateTime } from '../../utils/helpers'
import { SUPPORT_CATEGORIES, SUPPORT_STATUS, SUPPORT_PRIORITY, categoryLabel } from '../../utils/supportOptions'

const AdminSupportPage = function() {
    const navigate = useNavigate()
    const [searchInput, setSearchInput] = useState('')
    const [search,   setSearch]   = useState('')
    const [status,   setStatus]   = useState('active')
    const [category, setCategory] = useState('')
    const [priority, setPriority] = useState('')
    const [page,     setPage]     = useState(1)

    useEffect(function() {
        const t = setTimeout(function() { setSearch(searchInput.trim()); setPage(1) }, 350)
        return function() { clearTimeout(t) }
    }, [searchInput])

    const { items: tickets, pagination, loading, error } =
        useAdminList('/admin/support', { status, category, priority, search, page, limit: 20 })

    const reset = function(setter) { return function(e) { setter(e.target.value); setPage(1) } }

    return (
        <AdminLayout title="Support" subtitle="Requests from members and the public contact form">
            <div className="admin-filters">
                <input type="search" placeholder="Search subject, name or email" aria-label="Search tickets" value={searchInput} maxLength={100}
                    onChange={function(e) { setSearchInput(e.target.value) }} />
                <select aria-label="Filter by status" value={status} onChange={reset(setStatus)}>
                    <option value="active">Open + in progress</option>
                    <option value="">All statuses</option>
                    {Object.entries(SUPPORT_STATUS).map(function([v, s]) { return <option key={v} value={v}>{s.label}</option> })}
                </select>
                <select aria-label="Filter by category" value={category} onChange={reset(setCategory)}>
                    <option value="">All categories</option>
                    {SUPPORT_CATEGORIES.map(function(c) { return <option key={c.value} value={c.value}>{c.label}</option> })}
                </select>
                <select aria-label="Filter by priority" value={priority} onChange={reset(setPriority)}>
                    <option value="">All priorities</option>
                    {Object.entries(SUPPORT_PRIORITY).map(function([v, p]) { return <option key={v} value={v}>{p.label}</option> })}
                </select>
            </div>

            {error && <div role="alert" style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', marginBottom: '1rem' }}>{error}</div>}

            <div className="admin-card">
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><Spinner size="lg" /></div>
                ) : tickets.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '2.5rem 1rem', margin: 0 }}>No tickets match these filters.</p>
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr><th>Request</th><th>From</th><th>Category</th><th>Priority</th><th>Status</th><th>Updated</th><th></th></tr>
                            </thead>
                            <tbody>
                                {tickets.map(function(t) {
                                    const s = SUPPORT_STATUS[t.status] || SUPPORT_STATUS.open
                                    const p = SUPPORT_PRIORITY[t.priority] || SUPPORT_PRIORITY.normal
                                    const waiting = t.awaitingAdmin && t.status !== 'closed'
                                    return (
                                        // Whole row opens the ticket; the button below is the obvious way in.
                                        <tr key={t._id} className="admin-row-link" onClick={function() { navigate('/admin/support/' + t._id) }}>
                                            <td data-label="Request" style={{ maxWidth: 360 }}>
                                                <Link to={'/admin/support/' + t._id} onClick={function(e) { e.stopPropagation() }} style={{ fontWeight: 600, color: '#0f172a', textDecoration: 'none', overflowWrap: 'anywhere' }}>{t.subject}</Link>
                                                {waiting && <span className="admin-badge" style={{ background: '#2563eb', color: 'white', marginLeft: 8 }}>Needs reply</span>}
                                                {t.lastMessage && (
                                                    <p className="admin-ticket-preview">
                                                        <span style={{ fontWeight: 600, color: t.lastMessage.sender === 'admin' ? '#1d4ed8' : '#475569' }}>
                                                            {t.lastMessage.sender === 'admin' ? 'You: ' : t.name.split(' ')[0] + ': '}
                                                        </span>
                                                        {t.lastMessage.body}
                                                    </p>
                                                )}
                                            </td>
                                            <td data-label="From">
                                                <div>{t.name}</div>
                                                <div style={{ fontSize: '0.8125rem', color: '#64748b', overflowWrap: 'anywhere' }}>{t.email}{t.source === 'public' ? ' · contact form' : ''}</div>
                                            </td>
                                            <td data-label="Category">{categoryLabel(t.category)}</td>
                                            <td data-label="Priority"><span className="admin-badge" style={{ background: p.bg, color: p.color }}>{p.label}</span></td>
                                            <td data-label="Status"><span className="admin-badge" style={{ background: s.bg, color: s.color }}>{s.label}</span></td>
                                            <td data-label="Updated" style={{ whiteSpace: 'nowrap' }}>{formatDateTime(t.updatedAt)}</td>
                                            <td data-label="Action" style={{ whiteSpace: 'nowrap' }}>
                                                <Link to={'/admin/support/' + t._id} onClick={function(e) { e.stopPropagation() }}
                                                    className={'admin-btn admin-btn--sm' + (waiting ? ' admin-btn--primary' : '')}>
                                                    <MessageSquareReply size={14} aria-hidden="true" /> {waiting ? 'Open & reply' : 'Open'}
                                                </Link>
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
        </AdminLayout>
    )
}

export default AdminSupportPage
