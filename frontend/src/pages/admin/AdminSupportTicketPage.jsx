import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/axios'
import AdminLayout from '../../components/layout/AdminLayout'
import Spinner from '../../components/ui/Spinner'
import SupportThread from '../../components/ui/SupportThread'
import { formatDateTime } from '../../utils/helpers'
import { SUPPORT_STATUS, SUPPORT_PRIORITY, SUPPORT_MESSAGE_MAX, categoryLabel } from '../../utils/supportOptions'

const select = { padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', fontFamily: 'inherit', background: 'white', width: '100%' }

const AdminSupportTicketPage = function() {
    const { id } = useParams()
    const [ticket, setTicket] = useState(null)
    const [admins, setAdmins] = useState([])
    const [error,  setError]  = useState(null)
    const [reply,  setReply]  = useState('')
    const [busy,   setBusy]   = useState(false)
    const [notice, setNotice] = useState(null)

    useEffect(function() {
        api.get('/admin/support/' + id)
            .then(function({ data }) { setTicket(data.ticket) })
            .catch(function(err) { setError(err.response?.data?.message || 'Could not load this ticket') })
        api.get('/admin/users', { params: { role: 'admin', status: 'active', limit: 50 } })
            .then(function({ data }) { setAdmins(data.items || []) })
            .catch(function() { setAdmins([]) })
    }, [id])

    const act = async function(request, successText) {
        setBusy(true)
        setNotice(null)
        try {
            const { data } = await request()
            setTicket(data.ticket)
            setNotice({ kind: 'success', text: successText })
            return true
        } catch (err) {
            setNotice({ kind: 'error', text: err.response?.data?.message || 'Action failed' })
            return false
        } finally {
            setBusy(false)
        }
    }

    const sendReply = async function(e) {
        e.preventDefault()
        if (!reply.trim()) return
        const ok = await act(function() { return api.post('/admin/support/' + id + '/messages', { body: reply.trim() }) },
            'Reply sent — the user was notified by email' + (ticket.user ? ' and in the app.' : '.'))
        if (ok) setReply('')
    }

    const update = function(changes, text) {
        return act(function() { return api.patch('/admin/support/' + id, changes) }, text)
    }

    return (
        <AdminLayout title="Support ticket" subtitle={ticket ? categoryLabel(ticket.category) + ' · opened ' + formatDateTime(ticket.createdAt) : ''}
            actions={<Link to="/admin/support" className="admin-btn">← All tickets</Link>}>
            {error && <div role="alert" style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#fef2f2', color: '#b91c1c' }}>{error}</div>}
            {!error && !ticket && <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><Spinner size="lg" /></div>}

            {ticket && (
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: '1.25rem' }} className="admin-ticket-grid">
                    <div style={{ minWidth: 0 }}>
                        <div className="admin-card" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
                            <h2 style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 1rem', color: '#0f172a', overflowWrap: 'anywhere' }}>{ticket.subject}</h2>
                            <SupportThread messages={ticket.messages} viewer="admin" userName={ticket.name} />
                        </div>

                        {notice && <div role={notice.kind === 'error' ? 'alert' : 'status'} style={{ padding: '0.625rem 0.875rem', borderRadius: 8, marginBottom: '0.875rem', fontSize: '0.875rem', background: notice.kind === 'error' ? '#fef2f2' : '#f0fdf4', color: notice.kind === 'error' ? '#b91c1c' : '#166534' }}>{notice.text}</div>}

                        {ticket.status === 'closed' ? (
                            <div className="admin-card" style={{ padding: '1rem', color: '#475569', fontSize: '0.9rem' }}>This ticket is closed. Change the status to reopen it before replying.</div>
                        ) : (
                            <form onSubmit={sendReply} className="admin-card" style={{ padding: '1rem' }}>
                                <label htmlFor="admin-reply" style={{ display: 'block', fontWeight: 600, marginBottom: '0.375rem', fontSize: '0.875rem' }}>Reply as SkillSwap Support</label>
                                <textarea id="admin-reply" value={reply} maxLength={SUPPORT_MESSAGE_MAX} rows={5} onChange={function(e) { setReply(e.target.value) }}
                                    style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1px solid #e2e8f0', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.9rem', boxSizing: 'border-box', resize: 'vertical' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginTop: '0.625rem', flexWrap: 'wrap' }}>
                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>The user gets an email{ticket.user ? ' and an in-app notification' : ''}.</span>
                                    <button type="submit" className="admin-btn admin-btn--primary" disabled={busy || !reply.trim()}>{busy ? 'Sending...' : 'Send reply'}</button>
                                </div>
                            </form>
                        )}
                    </div>

                    <aside className="admin-card" style={{ padding: '1.25rem', alignSelf: 'start' }} aria-label="Ticket details">
                        <h3 style={{ fontSize: '0.8125rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', margin: '0 0 0.75rem' }}>Requester</h3>
                        <p style={{ margin: 0, fontWeight: 600 }}>{ticket.name}</p>
                        <p style={{ margin: '0.125rem 0 0', fontSize: '0.875rem', color: '#475569', overflowWrap: 'anywhere' }}>{ticket.email}</p>
                        <p style={{ margin: '0.375rem 0 1.25rem', fontSize: '0.8125rem', color: '#64748b' }}>
                            {ticket.user ? 'Member account' + (ticket.user.isActive === false ? ' (deactivated)' : '') : 'Public contact form (no account linked)'}
                        </p>

                        <label htmlFor="t-status" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>Status</label>
                        <select id="t-status" style={{ ...select, marginBottom: '0.875rem' }} value={ticket.status} disabled={busy}
                            onChange={function(e) { update({ status: e.target.value }, 'Status updated' + (e.target.value === 'resolved' ? ' — the user was notified.' : '.')) }}>
                            {Object.entries(SUPPORT_STATUS).map(function([v, s]) { return <option key={v} value={v}>{s.label}</option> })}
                        </select>

                        <label htmlFor="t-priority" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>Priority</label>
                        <select id="t-priority" style={{ ...select, marginBottom: '0.875rem' }} value={ticket.priority} disabled={busy}
                            onChange={function(e) { update({ priority: e.target.value }, 'Priority updated.') }}>
                            {Object.entries(SUPPORT_PRIORITY).map(function([v, p]) { return <option key={v} value={v}>{p.label}</option> })}
                        </select>

                        <label htmlFor="t-assignee" style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: 4 }}>Assigned to</label>
                        <select id="t-assignee" style={select} value={ticket.assignedTo?._id || ''} disabled={busy}
                            onChange={function(e) { update({ assignedTo: e.target.value }, 'Assignee updated.') }}>
                            <option value="">Unassigned</option>
                            {admins.map(function(a) { return <option key={a._id} value={a._id}>{a.fullName}</option> })}
                        </select>
                    </aside>
                </div>
            )}
        </AdminLayout>
    )
}

export default AdminSupportTicketPage
