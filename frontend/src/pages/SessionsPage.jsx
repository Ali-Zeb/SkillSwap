import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '../features/auth/authSlice'
import api from '../api/axios'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { getAvatarUrl, formatDateTime, formatDuration, capitalize } from '../utils/helpers'
// pending_approval added for Phase 2 session approval workflow
const STATUS_STYLES = {
    pending_approval: { bg: '#fef3c7', color: '#92400e' },
    scheduled:        { bg: '#dbeafe', color: '#1d4ed8' },
    confirmed:        { bg: '#d1fae5', color: '#065f46' },
    completed:        { bg: '#e0e7ff', color: '#4338ca' },
    cancelled:        { bg: '#fee2e2', color: '#991b1b' },
    rescheduled:      { bg: '#fef3c7', color: '#92400e' },
}
const SessionCard = function({ session, currentUser, onCancel, onComplete, onApprove, onDecline, actionState }) {
    const isTeacher   = session.teacherId?._id === currentUser?._id
    const partner     = isTeacher ? session.learnerId : session.teacherId
    const partnerName = partner?.fullName || 'Unknown'
    const isPast      = session.status === 'completed' || session.status === 'cancelled'
    const statusStyle = STATUS_STYLES[session.status] || STATUS_STYLES.scheduled
    const d           = new Date(session.date)
    const day         = d.getDate()
    const month       = d.toLocaleString('default', { month: 'short' }).toUpperCase()
    // Determine pending_approval role.
    // proposedBy may be a populated ObjectId object or a plain string.
    // Extract the string id safely before comparing.
    const isPendingApproval = session.status === 'pending_approval'
    const proposedById      = session.proposedBy?._id
        ? session.proposedBy._id.toString()
        : session.proposedBy
            ? session.proposedBy.toString()
            : null
    const isProposer = isPendingApproval && proposedById !== null && proposedById === currentUser?._id
    const isInvitee  = isPendingApproval && !isProposer
    return (
        <div style={{ background: 'white', borderRadius: 15, padding: '1.25rem 1.5rem', boxShadow: '0 5px 15px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center', minWidth: 52, flexShrink: 0 }}>
                <p style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb', lineHeight: 1 }}>{day}</p>
                <p style={{ fontSize: '0.6875rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginTop: 2 }}>{month}</p>
            </div>
            <div style={{ width: 1, height: 52, background: '#f1f5f9', flexShrink: 0 }} />
            <img
                src={getAvatarUrl(partner?.avatar, partnerName)}
                alt={partnerName}
                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', background: '#e2e8f0', border: '2px solid #f1f5f9', flexShrink: 0 }}
            />
            <div style={{ flex: 1, minWidth: 180 }}>
                <p style={{ fontWeight: 700, color: '#1e293b', fontSize: '1rem', marginBottom: 2 }}>
                    {session.title}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem', color: '#64748b', fontSize: '0.8125rem', marginTop: 4 }}>
                    <span>{'with ' + partnerName}</span>
                    <span>{'· ' + (isTeacher ? 'Teaching' : 'Learning')}</span>
                    <span>{'· ' + formatDateTime(session.date)}</span>
                    <span>{'· ' + formatDuration(session.duration)}</span>
                    <span>{'· ' + (session.sessionType === 'online' ? 'Online' : 'In Person')}</span>
                </div>
                {session.skillId?.name ? (
                    <span style={{ display: 'inline-block', marginTop: 6, padding: '0.125rem 0.625rem', background: '#dbeafe', color: '#1d4ed8', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>
                        {session.skillId.name}
                    </span>
                ) : null}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem', flexShrink: 0 }}>
                <span style={{ padding: '0.25rem 0.875rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: statusStyle.bg, color: statusStyle.color }}>
                    {isPendingApproval ? 'Pending Approval' : capitalize(session.status)}
                </span>
                {/* pending_approval: invitee sees Accept / Decline */}
                {isInvitee ? (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 4 }}>
                        <button
                            onClick={function() { onApprove(session._id) }}
                            disabled={!!actionState}
                            style={{ padding: '0.4375rem 1rem', background: '#10b981', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: actionState ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                        >
                            {actionState === 'approving' ? 'Accepting...' : 'Accept'}
                        </button>
                        <button
                            onClick={function() { onDecline(session._id) }}
                            disabled={!!actionState}
                            style={{ padding: '0.4375rem 0.875rem', background: 'white', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: actionState ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                        >
                            {actionState === 'declining' ? 'Declining...' : 'Decline'}
                        </button>
                    </div>
                ) : null}
                {/* pending_approval: proposer sees Awaiting label + Cancel only */}
                {isProposer ? (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: 4, alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8125rem', color: '#92400e' }}>Waiting for response</span>
                        <button
                            onClick={function() { onCancel(session._id) }}
                            disabled={!!actionState}
                            style={{ padding: '0.4375rem 0.875rem', background: 'white', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: actionState ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                        >
                            {actionState === 'cancelling' ? 'Cancelling...' : 'Cancel'}
                        </button>
                    </div>
                ) : null}
                {/* scheduled / confirmed: normal Enter Room + Complete + Cancel */}
                {!isPast && !isPendingApproval ? (
                    <div className="session-card-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: 4, flexWrap: 'wrap' }}>
                        <Link
                            to={'/session-room/' + session._id}
                            style={{ padding: '0.4375rem 1rem', background: '#2563eb', color: 'white', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}
                        >
                            Enter Room
                        </Link>
                        {/* Only once the session has started — the server enforces the same rule. */}
                        {new Date(session.date) <= new Date() ? (
                            <button
                                onClick={function() { onComplete(session._id) }}
                                disabled={!!actionState}
                                style={{ padding: '0.4375rem 0.875rem', background: '#d1fae5', color: '#065f46', border: 'none', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: actionState ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                            >
                                {actionState === 'completing' ? 'Completing...' : 'Mark as completed'}
                            </button>
                        ) : null}
                        <button
                            onClick={function() { onCancel(session._id) }}
                            disabled={!!actionState}
                            style={{ padding: '0.4375rem 0.875rem', background: 'white', color: '#ef4444', border: '1.5px solid #ef4444', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, cursor: actionState ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                        >
                            {actionState === 'cancelling' ? 'Cancelling...' : 'Cancel'}
                        </button>
                    </div>
                ) : null}
            </div>
        </div>
    )
}
const ScheduleModal = function({ onClose, onCreated, currentUser }) {
    const [title,       setTitle]       = useState('')
    const [description, setDescription] = useState('')
    const [partnerId,   setPartnerId]   = useState('')
    const [skillId,     setSkillId]     = useState('')
    const [date,        setDate]        = useState('')
    const [duration,    setDuration]    = useState(60)
    const [sessionType, setSessionType] = useState('online')
    const [meetingLink, setMeetingLink] = useState('')
    const [location,    setLocation]    = useState('')
    const [saving,      setSaving]      = useState(false)
    const [error,       setError]       = useState(null)
    const [connections, setConnections] = useState([])
    const [skills,      setSkills]      = useState([])
    const [loadingConn, setLoadingConn] = useState(true)
    useEffect(function() {
        // Fetch all accepted connections regardless of request direction.
        // GET /requests/connections returns both sent-and-accepted and
        // received-and-accepted in a normalised { partner } shape.
        setLoadingConn(true)
        api.get('/requests/connections')
            .then(function(res) {
                setConnections(res.data.connections || [])
            })
            .catch(function() { setConnections([]) })
            .finally(function() { setLoadingConn(false) })
    }, [])
    useEffect(function() {
        // BUG 1 FIX: Do not use currentUser?.skills from Redux state.
        // The Redux user object is set on login/register via GET /auth/me which
        // does NOT populate skills.skillId — so s.skillId is a raw ObjectId with
        // no .name property, making the dropdown appear empty.
        // Instead, fetch the fully-populated profile directly from the API.
        api.get('/users/profile')
            .then(function(res) {
                const user       = res.data.user
                const teachSkills = (user?.skills || []).filter(function(s) {
                    return s.type === 'teach' && s.skillId && s.skillId.name
                })
                setSkills(teachSkills)
            })
            .catch(function() {
                // Fallback: try to use Redux user skills if the API call fails.
                // These may have unpopulated skillId objects, so filter defensively.
                const teachSkills = (currentUser?.skills || []).filter(function(s) {
                    return s.type === 'teach' && s.skillId && (s.skillId.name || typeof s.skillId === 'string')
                })
                setSkills(teachSkills)
            })
    }, [currentUser])
    const handleSubmit = async function(e) {
        e.preventDefault()
        setError(null)
        if (!title || !partnerId || !date || !duration) {
            setError('Please fill in all required fields')
            return
        }
        if (!skillId) {
            setError('Please select a skill')
            return
        }
        setSaving(true)
        try {
            const { data } = await api.post('/sessions', {
                title,
                description,
                learnerId:  partnerId,
                teacherId:  currentUser?._id,
                skillId,
                date,
                duration:   Number(duration),
                sessionType,
                meetingLink,
                location,
            })
            onCreated(data.session)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to schedule session')
        } finally {
            setSaving(false)
        }
    }
    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)' }} onClick={onClose} />
            <div style={{ position: 'relative', width: '100%', maxWidth: 560, background: 'white', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', zIndex: 2001 }}>
                {/* Header */}
                <div className="schedule-modal-header" style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                    <div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Schedule New Session</h2>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 2 }}>Set up a learning session with your skill partner</p>
                    </div>
                    <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: 'none', background: '#f1f5f9', color: '#64748b', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit' }}>
                        X
                    </button>
                </div>
                {/* Form */}
                <div style={{ padding: '1.5rem 2rem', overflowY: 'auto', flex: 1 }}>
                    {error ? (
                        <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, marginBottom: '1.25rem' }}>
                            <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>{error}</p>
                        </div>
                    ) : null}
                    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                        {/* Step 1 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0 }}>1</div>
                            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>Select Partner</p>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Partner</label>
                            {loadingConn ? (
                                <p style={{ fontSize: '0.875rem', color: '#64748b' }}>Loading connections...</p>
                            ) : (
                                <select value={partnerId} onChange={function(e) { setPartnerId(e.target.value) }} style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #f1f5f9', borderRadius: 8, fontSize: '0.9375rem', color: '#1e293b', fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }} required>
                                    <option value="">Choose a skill partner</option>
                                    {connections.map(function(c) {
                                        return (
                                            <option key={c.partner?._id} value={c.partner?._id}>
                                                {c.partner?.fullName}
                                            </option>
                                        )
                                    })}
                                </select>
                            )}
                            {!loadingConn && connections.length === 0 ? (
                                <p style={{ fontSize: '0.8125rem', color: '#64748b', marginTop: 4 }}>No accepted connections yet. Accept requests first.</p>
                            ) : null}
                        </div>
                        {/* Step 2 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0 }}>2</div>
                            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>Session Details</p>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Session Topic</label>
                            <input type="text" value={title} onChange={function(e) { setTitle(e.target.value) }} placeholder="e.g. React Hooks Deep Dive" style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #f1f5f9', borderRadius: 8, fontSize: '0.9375rem', color: '#1e293b', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} required />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                Skill <span style={{ color: '#ef4444' }}>*</span>
                            </label>
                            {skills.length === 0 ? (
                                <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                                    No teach skills added yet. Go to Edit Profile to add skills first.
                                </p>
                            ) : (
                                <select value={skillId} onChange={function(e) { setSkillId(e.target.value) }} style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #f1f5f9', borderRadius: 8, fontSize: '0.9375rem', color: '#1e293b', fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }}>
                                    <option value="">Select a skill</option>
                                    {skills.map(function(s) {
                                        return <option key={s.skillId._id} value={s.skillId._id}>{s.skillId.name}</option>
                                    })}
                                </select>
                            )}
                        </div>
                        <div className="schedule-modal-date-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Date and Time</label>
                                <input type="datetime-local" value={date} onChange={function(e) { setDate(e.target.value) }} style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #f1f5f9', borderRadius: 8, fontSize: '0.9375rem', color: '#1e293b', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Duration</label>
                                <select value={duration} onChange={function(e) { setDuration(e.target.value) }} style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #f1f5f9', borderRadius: 8, fontSize: '0.9375rem', color: '#1e293b', fontFamily: 'inherit', background: 'white', outline: 'none', boxSizing: 'border-box' }}>
                                    <option value={30}>30 minutes</option>
                                    <option value={60}>60 minutes</option>
                                    <option value={90}>90 minutes</option>
                                    <option value={120}>2 hours</option>
                                    <option value={180}>3 hours</option>
                                </select>
                            </div>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Session Type</label>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                {['online', 'inperson'].map(function(type) {
                                    return (
                                        <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                            <input
                                                type="radio"
                                                name="sessionType"
                                                value={type}
                                                checked={sessionType === type}
                                                onChange={function() { setSessionType(type) }}
                                                style={{ accentColor: '#2563eb', width: 16, height: 16 }}
                                            />
                                            <span style={{ fontSize: '0.9375rem', color: '#1e293b', fontWeight: 500 }}>
                                                {type === 'online' ? 'Online' : 'In Person'}
                                            </span>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                        {sessionType === 'online' ? (
                            <div>
                                <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                    Meeting Link <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span>
                                </label>
                                <input type="url" value={meetingLink} onChange={function(e) { setMeetingLink(e.target.value) }} placeholder="https://meet.google.com/..." style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #f1f5f9', borderRadius: 8, fontSize: '0.9375rem', color: '#1e293b', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        ) : (
                            <div>
                                <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Location</label>
                                <input type="text" value={location} onChange={function(e) { setLocation(e.target.value) }} placeholder="e.g. University Library, Room 204" style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #f1f5f9', borderRadius: 8, fontSize: '0.9375rem', color: '#1e293b', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                            </div>
                        )}
                        {/* Step 3 */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', fontWeight: 700, flexShrink: 0 }}>3</div>
                            <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>Topics and Notes</p>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
                                Description <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span>
                            </label>
                            <textarea value={description} onChange={function(e) { setDescription(e.target.value) }} rows={3} placeholder="List the specific topics you want to cover in this session..." style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #f1f5f9', borderRadius: 8, fontSize: '0.9375rem', color: '#1e293b', fontFamily: 'inherit', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.5rem' }}>
                            <button type="button" onClick={onClose} style={{ flex: 1, padding: '0.75rem', background: 'white', color: '#1e293b', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                                Cancel
                            </button>
                            <button type="submit" disabled={saving} style={{ flex: 1, padding: '0.75rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: 10, fontSize: '0.9375rem', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}>
                                {saving ? <><Spinner size="sm" /> Scheduling...</> : 'Schedule Session'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
const SessionsPage = function() {
    const currentUser = useSelector(selectCurrentUser)
    const navigate    = useNavigate()
    const [activeTab,      setActiveTab]      = useState('upcoming')
    const [upcoming,       setUpcoming]       = useState([])
    const [past,           setPast]           = useState([])
    const [loading,        setLoading]        = useState(true)
    const [error,          setError]          = useState(null)
    const [actionStates,   setActionStates]   = useState({})
    const [showModal,      setShowModal]      = useState(false)
    const [scheduledAlert, setScheduledAlert] = useState(null)
    useEffect(function() {
        const load = async function() {
            setLoading(true)
            setError(null)
            try {
                const [a, b] = await Promise.allSettled([
                    api.get('/sessions/upcoming'),
                    api.get('/sessions/past'),
                ])
                if (a.status === 'fulfilled') setUpcoming(a.value.data.sessions || [])
                if (b.status === 'fulfilled') setPast(b.value.data.sessions || [])
            } catch {
                setError('Failed to load sessions')
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [])
    const handleApprove = async function(id) {
        setActionStates(function(p) { return { ...p, [id]: 'approving' } })
        try {
            const { data } = await api.put('/sessions/' + id + '/approve')
            // Replace the pending_approval session with the now-scheduled session
            // returned by the API, then clear the action state for that card.
            setUpcoming(function(p) { return p.map(function(s) { return s._id === id ? data.session : s }) })
            // BUG 2 FIX: clear actionState after successful approve so buttons
            // on the updated card are re-enabled. Previously only cleared on error.
            setActionStates(function(p) { return { ...p, [id]: null } })
        } catch {
            setActionStates(function(p) { return { ...p, [id]: null } })
        }
    }
    const handleDecline = async function(id) {
        setActionStates(function(p) { return { ...p, [id]: 'declining' } })
        try {
            await api.put('/sessions/' + id + '/decline')
            setUpcoming(function(p) { return p.filter(function(s) { return s._id !== id }) })
        } catch {
            setActionStates(function(p) { return { ...p, [id]: null } })
        }
    }
    const handleComplete = async function(id) {
        setActionStates(function(p) { return { ...p, [id]: 'completing' } })
        try {
            const { data } = await api.put('/sessions/' + id + '/complete')
            setUpcoming(function(p) { return p.filter(function(s) { return s._id !== id }) })
            setPast(function(p) { return [data.session, ...p.filter(function(s) { return s._id !== id })] })
        } catch (err) {
            setActionStates(function(p) { return { ...p, [id]: null } })
            setError(err.response?.data?.message || 'Could not mark the session as completed')
        }
    }
    const handleCancel = async function(id) {
        setActionStates(function(p) { return { ...p, [id]: 'cancelling' } })
        try {
            await api.put('/sessions/' + id + '/cancel')
            setUpcoming(function(p) { return p.filter(function(s) { return s._id !== id }) })
        } catch {
            setActionStates(function(p) { return { ...p, [id]: null } })
        }
    }
    if (loading) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <Spinner size="lg" />
                    <p style={{ color: '#64748b', marginTop: '0.75rem' }}>Loading sessions...</p>
                </div>
            </div>
        )
    }
    const upcomingLabel = 'Upcoming (' + upcoming.length + ')'
    const pastLabel     = 'Past (' + past.length + ')'
    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', padding: '2rem 1.25rem' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Sessions</h1>
                        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>Manage your teaching and learning sessions</p>
                    </div>
                    <button
                        onClick={function() { setShowModal(true) }}
                        style={{ padding: '0.625rem 1.375rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.9375rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                    >
                        Schedule Session
                    </button>
                </div>
                {/* Success banner shown after proposing a session */}
                {scheduledAlert ? (
                    <div style={{ padding: '1rem 1.25rem', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                        <div>
                            <p style={{ fontWeight: 600, color: '#166534', fontSize: '0.9375rem' }}>
                                Session proposed successfully!
                            </p>
                            <p style={{ fontSize: '0.875rem', color: '#16a34a', marginTop: 2 }}>
                                {scheduledAlert + ' will be notified and must confirm before the session is scheduled.'}
                            </p>
                        </div>
                        <button
                            onClick={function() { setScheduledAlert(null) }}
                            style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: '1rem', flexShrink: 0, fontFamily: 'inherit' }}
                        >
                            ✕
                        </button>
                    </div>
                ) : null}
                {error ? (
                    <div style={{ padding: '0.875rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: '1.25rem' }}>
                        <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{error}</p>
                    </div>
                ) : null}
                <div style={{ borderBottom: '2px solid #f1f5f9', marginBottom: '1.5rem', display: 'flex' }}>
                    {[{ id: 'upcoming', label: upcomingLabel }, { id: 'past', label: pastLabel }].map(function(tab) {
                        const active = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={function() { setActiveTab(tab.id) }}
                                style={{ padding: '0.75rem 1.5rem', border: 'none', background: 'none', color: active ? '#2563eb' : '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.9375rem', borderBottom: active ? '3px solid #2563eb' : '3px solid transparent', marginBottom: -2, transition: 'color 0.2s', fontFamily: 'inherit' }}
                            >
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
                {activeTab === 'upcoming' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {upcoming.length === 0 ? (
                            <div style={{ background: 'white', borderRadius: 15, padding: '2rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                                <EmptyState
                                    icon="📅"
                                    title="No upcoming sessions"
                                    message="Schedule a session with one of your connections to get started."
                                    action={function() { navigate('/requests') }}
                                    actionLabel="View Requests"
                                />
                            </div>
                        ) : (
                            upcoming.map(function(session) {
                                return (
                                    <SessionCard
                                        key={session._id}
                                        session={session}
                                        currentUser={currentUser}
                                        onApprove={handleApprove}
                                        onDecline={handleDecline}
                                        onCancel={handleCancel}
                                        onComplete={handleComplete}
                                        actionState={actionStates[session._id]}
                                    />
                                )
                            })
                        )}
                    </div>
                ) : null}
                {activeTab === 'past' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {past.length === 0 ? (
                            <div style={{ background: 'white', borderRadius: 15, padding: '2rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                                <EmptyState
                                    icon="📋"
                                    title="No past sessions"
                                    message="Your completed and cancelled sessions will appear here."
                                />
                            </div>
                        ) : (
                            past.map(function(session) {
                                return (
                                    <SessionCard
                                        key={session._id}
                                        session={session}
                                        currentUser={currentUser}
                                        onApprove={handleApprove}
                                        onDecline={handleDecline}
                                        onCancel={handleCancel}
                                        onComplete={handleComplete}
                                        actionState={actionStates[session._id]}
                                    />
                                )
                            })
                        )}
                    </div>
                ) : null}
                {showModal ? (
                    <ScheduleModal
                        onClose={function() { setShowModal(false) }}
                        onCreated={function(session) {
                            // Add session to upcoming list.
                            // Do NOT navigate to session room — session is pending_approval
                            // and must be confirmed by the partner before it is scheduled.
                            setUpcoming(function(p) { return [session, ...p] })
                            setShowModal(false)
                            // Show confirmation banner with partner name
                            const partnerName = session.learnerId?.fullName || 'Your partner'
                            setScheduledAlert(partnerName)
                        }}
                        currentUser={currentUser}
                    />
                ) : null}
            </div>
        </div>
    )
}
export default SessionsPage