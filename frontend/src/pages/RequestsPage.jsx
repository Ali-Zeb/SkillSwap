import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../api/axios'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { getAvatarUrl, formatReputation, timeAgo, filterSkillsByType } from '../utils/helpers'

const STATUS_STYLES = {
    pending:  { bg: '#fef3c7', color: '#92400e', label: 'Pending'  },
    accepted: { bg: '#d1fae5', color: '#065f46', label: 'Accepted' },
    declined: { bg: '#fee2e2', color: '#991b1b', label: 'Declined' },
}

const RequestsPage = function() {
    const [activeTab,     setActiveTab]     = useState('incoming')
    const [incoming,      setIncoming]      = useState([])
    const [sent,          setSent]          = useState([])
    const [loading,       setLoading]       = useState(true)
    const [error,         setError]         = useState(null)
    const [actionStates,  setActionStates]  = useState({})
    // connectedInfo holds { name, userId } of the person just accepted.
    // Shown as a success banner with Message and Schedule CTAs.
    const [connectedInfo, setConnectedInfo] = useState(null)

    useEffect(function() {
        const fetchAll = async function() {
            setLoading(true)
            setError(null)
            try {
                const [incomingRes, sentRes] = await Promise.allSettled([
                    api.get('/requests/incoming'),
                    api.get('/requests/sent'),
                ])
                if (incomingRes.status === 'fulfilled') setIncoming(incomingRes.value.data.requests || [])
                if (sentRes.status === 'fulfilled')     setSent(sentRes.value.data.requests || [])
            } catch {
                setError('Failed to load requests')
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [])

    // Dismiss the connected banner when the user switches tabs
    const handleTabChange = function(tabId) {
        setActiveTab(tabId)
        setConnectedInfo(null)
    }

    const handleAccept = async function(requestId) {
        setActionStates(function(p) { return { ...p, [requestId]: 'accepting' } })
        // Capture the sender's info before removing the card from state
        const accepted = incoming.find(function(r) { return r._id === requestId })
        const sender   = accepted?.senderId
        try {
            await api.put('/requests/' + requestId + '/accept')
            setIncoming(function(p) { return p.filter(function(r) { return r._id !== requestId }) })
            if (sender) {
                setConnectedInfo({ name: sender.fullName, userId: sender._id })
            }
        } catch {
            setActionStates(function(p) { return { ...p, [requestId]: null } })
        }
    }

    const handleDecline = async function(requestId) {
        setActionStates(function(p) { return { ...p, [requestId]: 'declining' } })
        try {
            await api.put('/requests/' + requestId + '/decline')
            setIncoming(function(p) { return p.filter(function(r) { return r._id !== requestId }) })
        } catch {
            setActionStates(function(p) { return { ...p, [requestId]: null } })
        }
    }

    if (loading) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <Spinner size="lg" />
                    <p style={{ color: '#64748b', marginTop: '0.75rem', fontSize: '0.9375rem' }}>Loading requests...</p>
                </div>
            </div>
        )
    }

    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', padding: '2rem 1.25rem' }}>
            {/* Responsive rules — inline styles can't do media queries, so this
                small stylesheet handles the mobile breakpoint for request cards. */}
            <style>{`
                .req-card {
                    background: white;
                    border-radius: 15px;
                    padding: 1.5rem;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                    display: flex;
                    align-items: flex-start;
                    gap: 1.25rem;
                    flex-wrap: wrap;
                }
                .req-info {
                    flex: 1 1 240px;
                    min-width: 0;
                }
                .req-header-row {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                    margin-bottom: 0.5rem;
                }
                .req-buttons {
                    display: flex;
                    gap: 0.625rem;
                    flex-wrap: wrap;
                }
                .req-btn {
                    flex: none;
                    text-align: center;
                    white-space: nowrap;
                }
                .req-banner {
                    padding: 1rem 1.25rem;
                    background: #f0fdf4;
                    border: 1px solid #86efac;
                    border-radius: 12px;
                    margin-bottom: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                .req-banner-actions {
                    display: flex;
                    gap: 0.625rem;
                    flex-wrap: wrap;
                    align-items: center;
                }

                @media (max-width: 640px) {
                    .req-card {
                        flex-direction: column;
                        align-items: stretch;
                        text-align: center;
                    }
                    .req-avatar-link {
                        align-self: center;
                    }
                    .req-header-row {
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                    }
                    .req-header-row > span[style*="marginLeft"] {
                        margin-left: 0 !important;
                    }
                    .req-tags-row {
                        justify-content: center;
                    }
                    .req-buttons {
                        width: 100%;
                    }
                    .req-btn {
                        flex: 1 1 45% !important;
                    }
                    .req-banner {
                        flex-direction: column;
                        text-align: center;
                    }
                    .req-banner-actions {
                        width: 100%;
                        justify-content: center;
                    }
                }
            `}</style>

            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '1.75rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Connection Requests</h1>
                    <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Manage incoming and sent connection requests</p>
                </div>

                {/* Info tip */}
                <div style={{ padding: '1rem 1.25rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, marginBottom: '1.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                    <span style={{ fontSize: '1.25rem', flexShrink: 0, marginTop: 2 }}>💡</span>
                    <div>
                        <p style={{ fontWeight: 600, color: '#1d4ed8', fontSize: '0.9rem', marginBottom: 2 }}>How requests work</p>
                        <p style={{ color: '#3b82f6', fontSize: '0.875rem', lineHeight: 1.5 }}>
                            <strong>Incoming</strong> — requests sent to you. Accept to connect, decline to reject.
                            <br />
                            <strong>Sent</strong> — requests you sent. Once accepted, you can message and schedule sessions.
                        </p>
                    </div>
                </div>

                {/* Error */}
                {error ? (
                    <div style={{ padding: '0.875rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: '1.25rem' }}>
                        <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{error}</p>
                    </div>
                ) : null}

                {/* Connected success banner */}
                {connectedInfo ? (
                    <div className="req-banner">
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 700, color: '#166534', fontSize: '0.9375rem', marginBottom: 2 }}>
                                {'🎉 You are now connected with ' + connectedInfo.name + '!'}
                            </p>
                            <p style={{ fontSize: '0.8125rem', color: '#15803d' }}>
                                You can now message them and schedule a skill exchange session.
                            </p>
                        </div>
                        <div className="req-banner-actions">
                            <Link
                                to={'/messages/' + connectedInfo.userId}
                                style={{ padding: '0.5rem 1.125rem', background: '#2563eb', color: 'white', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}
                            >
                                Message Now
                            </Link>
                            <Link
                                to="/sessions"
                                style={{ padding: '0.5rem 1.125rem', background: 'white', color: '#166534', border: '1.5px solid #86efac', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}
                            >
                                Schedule Session
                            </Link>
                            <button
                                onClick={function() { setConnectedInfo(null) }}
                                style={{ padding: '0.5rem', background: 'none', border: 'none', color: '#166534', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', lineHeight: 1 }}
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ) : null}

                {/* Tabs */}
                <div style={{ borderBottom: '2px solid #f1f5f9', marginBottom: '1.5rem', display: 'flex' }}>
                    {[
                        { id: 'incoming', label: 'Incoming (' + incoming.length + ')' },
                        { id: 'sent',     label: 'Sent (' + sent.length + ')'         },
                    ].map(function(tab) {
                        const active = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={function() { handleTabChange(tab.id) }}
                                style={{ padding: '0.75rem 1.5rem', border: 'none', background: 'none', color: active ? '#2563eb' : '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.9375rem', borderBottom: active ? '3px solid #2563eb' : '3px solid transparent', marginBottom: -2, transition: 'color 0.2s', fontFamily: 'inherit' }}
                            >
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                {/* INCOMING TAB */}
                {activeTab === 'incoming' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {incoming.length === 0 ? (
                            <div style={{ background: 'white', borderRadius: 15, padding: '2rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                                <EmptyState
                                    icon="📨"
                                    title="No incoming requests"
                                    message="When someone sends you a connection request from the Matches page, it will appear here."
                                />
                            </div>
                        ) : (
                            incoming.map(function(request) {
                                const sender      = request.senderId
                                const state       = actionStates[request._id]
                                const senderTeach = filterSkillsByType(sender?.skills || [], 'teach')
                                const senderLearn = filterSkillsByType(sender?.skills || [], 'learn')
                                return (
                                    <div key={request._id} className="req-card">
                                        <Link to={'/profile/' + sender?._id} className="req-avatar-link" style={{ flexShrink: 0 }}>
                                            <img
                                                src={getAvatarUrl(sender?.avatar, sender?.fullName)}
                                                alt={sender?.fullName}
                                                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', background: '#e2e8f0', border: '3px solid #f1f5f9', display: 'block' }}
                                            />
                                        </Link>
                                        <div className="req-info">
                                            <div className="req-header-row">
                                                <Link
                                                    to={'/profile/' + sender?._id}
                                                    style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#1e293b', textDecoration: 'none' }}
                                                    onMouseEnter={function(e) { e.currentTarget.style.color = '#2563eb' }}
                                                    onMouseLeave={function(e) { e.currentTarget.style.color = '#1e293b' }}
                                                >
                                                    {sender?.fullName}
                                                </Link>
                                                {sender?.headline ? (
                                                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{sender.headline}</span>
                                                ) : null}
                                                <span style={{ marginLeft: 'auto', fontSize: '0.8125rem', color: '#64748b' }}>
                                                    {timeAgo(request.createdAt)}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.625rem', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'inherit' }}>
                                                <span style={{ color: '#f59e0b' }}>★</span>
                                                {formatReputation(sender?.reputation) + ' reputation'}
                                            </p>
                                            {(senderTeach.length > 0 || senderLearn.length > 0) ? (
                                                <div className="req-tags-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '0.875rem' }}>
                                                    {senderTeach.slice(0, 3).map(function(s) {
                                                        return (
                                                            <span key={s.skillId?._id} style={{ padding: '0.1875rem 0.75rem', borderRadius: 20, fontSize: '0.8125rem', fontWeight: 500, background: '#dbeafe', color: '#1d4ed8', whiteSpace: 'nowrap' }}>
                                                                {'Teaches: ' + s.skillId?.name}
                                                            </span>
                                                        )
                                                    })}
                                                    {senderLearn.slice(0, 2).map(function(s) {
                                                        return (
                                                            <span key={s.skillId?._id} style={{ padding: '0.1875rem 0.75rem', borderRadius: 20, fontSize: '0.8125rem', background: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                                                {'Wants: ' + s.skillId?.name}
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                            ) : null}
                                            {request.message ? (
                                                <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9', marginBottom: '0.875rem' }}>
                                                    <p style={{ fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>
                                                        {'"' + request.message + '"'}
                                                    </p>
                                                </div>
                                            ) : null}
                                            <div className="req-buttons">
                                                <button
                                                    onClick={function() { handleAccept(request._id) }}
                                                    disabled={!!state}
                                                    className="req-btn"
                                                    style={{ padding: '0.5625rem 1.375rem', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: state ? 'not-allowed' : 'pointer', opacity: state === 'accepting' ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}
                                                >
                                                    {state === 'accepting' ? <><Spinner size="sm" /> Accepting...</> : 'Accept'}
                                                </button>
                                                <button
                                                    onClick={function() { handleDecline(request._id) }}
                                                    disabled={!!state}
                                                    className="req-btn"
                                                    style={{ padding: '0.5625rem 1.375rem', background: 'white', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: state ? 'not-allowed' : 'pointer', opacity: state === 'declining' ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontFamily: 'inherit' }}
                                                >
                                                    {state === 'declining' ? <><Spinner size="sm" /> Declining...</> : 'Decline'}
                                                </button>
                                                <Link
                                                    to={'/profile/' + sender?._id}
                                                    className="req-btn"
                                                    style={{ padding: '0.5625rem 1.125rem', background: '#f8fafc', color: '#1e293b', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}
                                                >
                                                    View Profile
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                ) : null}

                {/* SENT TAB */}
                {activeTab === 'sent' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {sent.length === 0 ? (
                            <div style={{ background: 'white', borderRadius: 15, padding: '2rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                                <EmptyState
                                    icon="📤"
                                    title="No sent requests"
                                    message="Go to Matches and click Connect on a compatible partner to send a request."
                                    action={function() { window.location.href = '/matches' }}
                                    actionLabel="Browse Matches"
                                />
                            </div>
                        ) : (
                            sent.map(function(request) {
                                const receiver    = request.receiverId
                                const statusStyle = STATUS_STYLES[request.status] || STATUS_STYLES.pending
                                const recvTeach   = filterSkillsByType(receiver?.skills || [], 'teach')
                                const recvLearn   = filterSkillsByType(receiver?.skills || [], 'learn')
                                return (
                                    <div key={request._id} className="req-card">
                                        <Link to={'/profile/' + receiver?._id} className="req-avatar-link" style={{ flexShrink: 0 }}>
                                            <img
                                                src={getAvatarUrl(receiver?.avatar, receiver?.fullName)}
                                                alt={receiver?.fullName}
                                                style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', background: '#e2e8f0', border: '3px solid #f1f5f9', display: 'block' }}
                                            />
                                        </Link>
                                        <div className="req-info">
                                            <div className="req-header-row">
                                                <Link
                                                    to={'/profile/' + receiver?._id}
                                                    style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#1e293b', textDecoration: 'none' }}
                                                    onMouseEnter={function(e) { e.currentTarget.style.color = '#2563eb' }}
                                                    onMouseLeave={function(e) { e.currentTarget.style.color = '#1e293b' }}
                                                >
                                                    {receiver?.fullName}
                                                </Link>
                                                {receiver?.headline ? (
                                                    <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{receiver.headline}</span>
                                                ) : null}
                                                <span style={{ marginLeft: 'auto', padding: '0.25rem 0.875rem', borderRadius: 20, fontSize: '0.8125rem', fontWeight: 600, background: statusStyle.bg, color: statusStyle.color }}>
                                                    {statusStyle.label}
                                                </span>
                                            </div>
                                            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '0.625rem' }}>
                                                {'Sent ' + timeAgo(request.createdAt)}
                                            </p>
                                            {request.status === 'pending' ? (
                                                <div style={{ padding: '0.625rem 0.875rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: '0.875rem' }}>
                                                    <p style={{ fontSize: '0.8125rem', color: '#92400e' }}>
                                                        {'Waiting for ' + (receiver?.fullName?.split(' ')[0] || 'them') + ' to respond. They will see it in their Requests \u2192 Incoming tab.'}
                                                    </p>
                                                </div>
                                            ) : null}
                                            {request.status === 'accepted' ? (
                                                <div style={{ padding: '0.625rem 0.875rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, marginBottom: '0.875rem' }}>
                                                    <p style={{ fontSize: '0.8125rem', color: '#166534' }}>
                                                        {'Connected! You can now message ' + (receiver?.fullName?.split(' ')[0] || 'them') + ' and schedule sessions.'}
                                                    </p>
                                                </div>
                                            ) : null}
                                            {request.status === 'declined' ? (
                                                <div style={{ padding: '0.625rem 0.875rem', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, marginBottom: '0.875rem' }}>
                                                    <p style={{ fontSize: '0.8125rem', color: '#991b1b' }}>
                                                        {(receiver?.fullName?.split(' ')[0] || 'They') + ' declined your request.'}
                                                    </p>
                                                </div>
                                            ) : null}
                                            {(recvTeach.length > 0 || recvLearn.length > 0) ? (
                                                <div className="req-tags-row" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '0.875rem' }}>
                                                    {recvTeach.slice(0, 3).map(function(s) {
                                                        return (
                                                            <span key={s.skillId?._id} style={{ padding: '0.1875rem 0.75rem', borderRadius: 20, fontSize: '0.8125rem', fontWeight: 500, background: '#dbeafe', color: '#1d4ed8', whiteSpace: 'nowrap' }}>
                                                                {'Teaches: ' + s.skillId?.name}
                                                            </span>
                                                        )
                                                    })}
                                                    {recvLearn.slice(0, 2).map(function(s) {
                                                        return (
                                                            <span key={s.skillId?._id} style={{ padding: '0.1875rem 0.75rem', borderRadius: 20, fontSize: '0.8125rem', background: '#f8fafc', color: '#1e293b', border: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                                                {'Wants: ' + s.skillId?.name}
                                                            </span>
                                                        )
                                                    })}
                                                </div>
                                            ) : null}
                                            <div className="req-buttons">
                                                <Link
                                                    to={'/profile/' + receiver?._id}
                                                    className="req-btn"
                                                    style={{ padding: '0.5rem 1.125rem', background: '#f8fafc', color: '#1e293b', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}
                                                >
                                                    View Profile
                                                </Link>
                                                {request.status === 'accepted' ? (
                                                    <Link
                                                        to={'/messages/' + receiver?._id}
                                                        className="req-btn"
                                                        style={{ padding: '0.5rem 1.125rem', background: '#2563eb', color: 'white', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}
                                                    >
                                                        Send Message
                                                    </Link>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                ) : null}
            </div>
        </div>
    )
}

export default RequestsPage