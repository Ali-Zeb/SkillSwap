import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import usePageMeta from '../hooks/usePageMeta'
import { formatDate } from '../utils/helpers'
import {
    SUPPORT_CATEGORIES, SUPPORT_STATUS, SUPPORT_SUBJECT_MAX, SUPPORT_MESSAGE_MAX, SUPPORT_MESSAGE_MIN, categoryLabel
} from '../utils/supportOptions'

const field = { width: '100%', padding: '0.6875rem 0.875rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9375rem', fontFamily: 'inherit', color: '#1e293b', boxSizing: 'border-box', background: 'white' }
const label = { display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.375rem', fontSize: '0.9rem' }

const NewTicketForm = function({ onCreated }) {
    const [category, setCategory] = useState('')
    const [subject,  setSubject]  = useState('')
    const [message,  setMessage]  = useState('')
    const [busy,     setBusy]     = useState(false)
    const [error,    setError]    = useState(null)

    const submit = async function(e) {
        e.preventDefault()
        setError(null)
        if (!category)                                  { setError('Please choose a category'); return }
        if (subject.trim().length < 3)                  { setError('Please add a short subject'); return }
        if (message.trim().length < SUPPORT_MESSAGE_MIN) { setError('Please describe the problem in at least ' + SUPPORT_MESSAGE_MIN + ' characters'); return }
        setBusy(true)
        try {
            const { data } = await api.post('/support', { category, subject: subject.trim(), message: message.trim() })
            setCategory(''); setSubject(''); setMessage('')
            onCreated(data.ticket)
        } catch (err) {
            setError(err.response?.data?.message || 'Could not send your request. Please try again.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <form onSubmit={submit} noValidate style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', padding: '1.25rem' }}>
            <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, margin: '0 0 1rem', color: '#1e293b' }}>Contact the support team</h2>
            {error && <div role="alert" style={{ padding: '0.625rem 0.875rem', borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '0.875rem' }}>{error}</div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.875rem', marginBottom: '0.875rem' }}>
                <div>
                    <label htmlFor="support-category" style={label}>Category</label>
                    <select id="support-category" value={category} onChange={function(e) { setCategory(e.target.value) }} style={field}>
                        <option value="">Choose a category</option>
                        {SUPPORT_CATEGORIES.map(function(c) { return <option key={c.value} value={c.value}>{c.label}</option> })}
                    </select>
                </div>
                <div>
                    <label htmlFor="support-subject" style={label}>Subject</label>
                    <input id="support-subject" type="text" value={subject} maxLength={SUPPORT_SUBJECT_MAX} onChange={function(e) { setSubject(e.target.value) }} style={field} placeholder="Short summary" />
                </div>
            </div>
            <label htmlFor="support-message" style={label}>Message</label>
            <textarea id="support-message" value={message} maxLength={SUPPORT_MESSAGE_MAX} rows={5} onChange={function(e) { setMessage(e.target.value) }} style={{ ...field, resize: 'vertical' }} placeholder="Tell us what happened and what you expected." />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{message.length}/{SUPPORT_MESSAGE_MAX}</span>
                <button type="submit" disabled={busy} style={{ padding: '0.625rem 1.25rem', borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.7 : 1, fontFamily: 'inherit' }}>
                    {busy ? 'Sending...' : 'Send request'}
                </button>
            </div>
        </form>
    )
}

const SupportPage = function() {
    usePageMeta('Help & Support', 'Contact the SkillSwap support team and follow your requests.')
    const [tickets, setTickets] = useState(null)
    const [error,   setError]   = useState(null)
    const [notice,  setNotice]  = useState(null)

    useEffect(function() {
        api.get('/support/mine')
            .then(function({ data }) { setTickets(data.tickets) })
            .catch(function(err) { setError(err.response?.data?.message || 'Could not load your requests') })
    }, [])

    const onCreated = function(ticket) {
        setNotice('Your request was sent. We usually reply within 2 business days and will notify you by email.')
        setTickets(function(list) { return [{ ...ticket, messageCount: 1, lastMessageFrom: 'user' }, ...(list || [])] })
    }

    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', padding: '2rem 1.25rem' }}>
            <div style={{ maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Help & Support</h1>
                    <p style={{ color: '#64748b', marginTop: 4 }}>Questions, problems or feedback — our team is here to help.</p>
                </div>

                {notice && <div role="status" style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#f0fdf4', color: '#166534', fontSize: '0.9rem' }}>{notice}</div>}
                <NewTicketForm onCreated={onCreated} />

                <section aria-labelledby="my-requests" style={{ background: 'white', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
                    <h2 id="my-requests" style={{ fontSize: '1.0625rem', fontWeight: 700, margin: 0, padding: '1rem 1.25rem', borderBottom: '1px solid #f1f5f9', color: '#1e293b' }}>My requests</h2>
                    {error && <p role="alert" style={{ color: '#b91c1c', padding: '1rem 1.25rem', margin: 0 }}>{error}</p>}
                    {!error && tickets === null && <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}><Spinner /></div>}
                    {!error && tickets && tickets.length === 0 && <EmptyState icon="💬" title="No requests yet" message="When you contact support, your requests and our replies appear here." />}
                    {!error && tickets && tickets.length > 0 && (
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                            {tickets.map(function(t) {
                                const s = SUPPORT_STATUS[t.status] || SUPPORT_STATUS.open
                                const newReply = t.lastMessageFrom === 'admin' && t.status !== 'closed'
                                return (
                                    <li key={t._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <Link to={'/support/' + t._id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.875rem 1.25rem', textDecoration: 'none', color: 'inherit', flexWrap: 'wrap' }}>
                                            <div style={{ flex: 1, minWidth: 200 }}>
                                                <div style={{ fontWeight: 600, color: '#1e293b', overflowWrap: 'anywhere' }}>{t.subject}</div>
                                                <div style={{ fontSize: '0.8125rem', color: '#64748b' }}>{categoryLabel(t.category)} · opened {formatDate(t.createdAt)}</div>
                                            </div>
                                            {newReply && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#2563eb' }}>New reply</span>}
                                            <span style={{ padding: '0.1875rem 0.625rem', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600, background: s.bg, color: s.color, whiteSpace: 'nowrap' }}>{s.label}</span>
                                        </Link>
                                    </li>
                                )
                            })}
                        </ul>
                    )}
                </section>
            </div>
        </div>
    )
}

export default SupportPage
