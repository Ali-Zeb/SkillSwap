import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import api from '../api/axios'
import Spinner from '../components/ui/Spinner'
import SupportThread from '../components/ui/SupportThread'
import usePageMeta from '../hooks/usePageMeta'
import { selectCurrentUser } from '../features/auth/authSlice'
import { SUPPORT_STATUS, SUPPORT_MESSAGE_MAX, categoryLabel } from '../utils/supportOptions'
import { formatDate } from '../utils/helpers'

const SupportTicketPage = function() {
    const { id } = useParams()
    const me = useSelector(selectCurrentUser)
    const [ticket, setTicket] = useState(null)
    const [error,  setError]  = useState(null)
    const [reply,  setReply]  = useState('')
    const [busy,   setBusy]   = useState(false)
    const [replyError, setReplyError] = useState(null)
    usePageMeta(ticket ? ticket.subject + ' · Support' : 'Support request', 'Your SkillSwap support conversation.')

    useEffect(function() {
        api.get('/support/' + id)
            .then(function({ data }) { setTicket(data.ticket) })
            .catch(function(err) { setError(err.response?.data?.message || 'Could not load this request') })
    }, [id])

    const send = async function(e) {
        e.preventDefault()
        if (!reply.trim()) return
        setBusy(true)
        setReplyError(null)
        try {
            const { data } = await api.post('/support/' + id + '/messages', { body: reply.trim() })
            setTicket(data.ticket)
            setReply('')
        } catch (err) {
            setReplyError(err.response?.data?.message || 'Could not send your reply')
        } finally {
            setBusy(false)
        }
    }

    const s = ticket ? (SUPPORT_STATUS[ticket.status] || SUPPORT_STATUS.open) : null

    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', padding: '2rem 1.25rem' }}>
            <div style={{ maxWidth: 820, margin: '0 auto' }}>
                <Link to="/support" style={{ color: '#2563eb', textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500 }}>← All requests</Link>

                {error && <div role="alert" style={{ marginTop: '1rem', padding: '0.875rem 1rem', borderRadius: 10, background: '#fef2f2', color: '#b91c1c' }}>{error}</div>}
                {!error && !ticket && <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><Spinner size="lg" /></div>}

                {ticket && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', margin: '0.75rem 0 1.25rem', flexWrap: 'wrap' }}>
                            <div style={{ minWidth: 0 }}>
                                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0, overflowWrap: 'anywhere' }}>{ticket.subject}</h1>
                                <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.875rem' }}>{categoryLabel(ticket.category)} · opened {formatDate(ticket.createdAt)}</p>
                            </div>
                            <span style={{ padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.8125rem', fontWeight: 600, background: s.bg, color: s.color }}>{s.label}</span>
                        </div>

                        <SupportThread messages={ticket.messages} viewer="user" userName={me?.fullName || ticket.name} />

                        {ticket.status === 'closed' ? (
                            <div style={{ marginTop: '1.25rem', padding: '0.875rem 1rem', borderRadius: 10, background: '#f1f5f9', color: '#475569', fontSize: '0.9rem' }}>
                                This request is closed. <Link to="/support" style={{ color: '#2563eb' }}>Open a new request</Link> if you still need help.
                            </div>
                        ) : (
                            <form onSubmit={send} style={{ marginTop: '1.25rem', background: 'white', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', padding: '1rem' }}>
                                <label htmlFor="support-reply" style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.375rem', fontSize: '0.9rem' }}>
                                    {ticket.status === 'resolved' ? 'Still need help? Reply to reopen this request' : 'Reply'}
                                </label>
                                {replyError && <p role="alert" style={{ color: '#b91c1c', fontSize: '0.875rem', margin: '0 0 0.5rem' }}>{replyError}</p>}
                                <textarea id="support-reply" value={reply} maxLength={SUPPORT_MESSAGE_MAX} rows={4} onChange={function(e) { setReply(e.target.value) }}
                                    style={{ width: '100%', padding: '0.6875rem 0.875rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9375rem', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }} />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.625rem' }}>
                                    <button type="submit" disabled={busy || !reply.trim()} style={{ padding: '0.5625rem 1.125rem', borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: 'pointer', opacity: busy || !reply.trim() ? 0.6 : 1, fontFamily: 'inherit' }}>
                                        {busy ? 'Sending...' : 'Send reply'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default SupportTicketPage
