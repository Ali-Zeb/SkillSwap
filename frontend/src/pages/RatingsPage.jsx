import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '../features/auth/authSlice'
import api from '../api/axios'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { getAvatarUrl, formatReputation, timeAgo } from '../utils/helpers'
const StarPicker = function({ value, onChange }) {
    const [hovered, setHovered] = useState(0)
    return (
        <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5].map(function(star) {
                const filled = star <= (hovered || value)
                return (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onChange(star)}
                        onMouseEnter={() => setHovered(star)}
                        onMouseLeave={() => setHovered(0)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, fontSize: '1.75rem', color: filled ? '#f59e0b' : '#e2e8f0', transition: 'all 0.1s' }}
                    >
                        {filled ? '★' : '☆'}
                    </button>
                )
            })}
        </div>
    )
}
const STAR_LABELS = { 1: 'Poor', 2: 'Fair', 3: 'Good', 4: 'Very Good', 5: 'Excellent' }
const RatingsPage = function() {
    const currentUser = useSelector(selectCurrentUser)
    const [activeTab,         setActiveTab]         = useState('pending')
    const [completedSessions, setCompletedSessions] = useState([])
    const [receivedRatings,   setReceivedRatings]   = useState([])
    const [loadingSessions,   setLoadingSessions]   = useState(true)
    const [loadingRatings,    setLoadingRatings]    = useState(true)
    const [ratingForms,       setRatingForms]       = useState({})
    const [submittingId,      setSubmittingId]      = useState(null)
    const [submittedIds,      setSubmittedIds]      = useState([])
    const [error,             setError]             = useState(null)
    useEffect(function() {
        api.get('/sessions/past')
            .then(function(res) {
                const completed = (res.data.sessions || []).filter(function(s) { return s.status === 'completed' })
                setCompletedSessions(completed)
                const forms = {}
                completed.forEach(function(s) { forms[s._id] = { rating: 0, comment: '' } })
                setRatingForms(forms)
            })
            .catch(function() { setCompletedSessions([]) })
            .finally(function() { setLoadingSessions(false) })
    }, [])
    useEffect(function() {
        if (!currentUser?._id) return
        api.get('/ratings/user/' + currentUser._id)
            .then(function(res) { setReceivedRatings(res.data.ratings || []) })
            .catch(function() { setReceivedRatings([]) })
            .finally(function() { setLoadingRatings(false) })
    }, [currentUser])
    const handleRatingChange = function(sessionId, field, value) {
        setRatingForms(function(prev) {
            return { ...prev, [sessionId]: { ...prev[sessionId], [field]: value } }
        })
    }
    const handleSubmit = async function(session) {
        const form = ratingForms[session._id]
        if (!form || form.rating === 0) {
            setError('Please select a star rating before submitting')
            return
        }
        const isTeacher  = session.teacherId?._id === currentUser?._id
        const revieweeId = isTeacher ? session.learnerId?._id : session.teacherId?._id
        setSubmittingId(session._id)
        setError(null)
        try {
            await api.post('/ratings', {
                sessionId:  session._id,
                revieweeId,
                rating:     form.rating,
                comment:    form.comment,
            })
            setSubmittedIds(function(prev) { return [...prev, session._id] })
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to submit rating')
        } finally {
            setSubmittingId(null)
        }
    }
    const pendingSessions = completedSessions.filter(function(s) { return !submittedIds.includes(s._id) })
    const avgRating = receivedRatings.length > 0
        ? (receivedRatings.reduce(function(sum, r) { return sum + r.rating }, 0) / receivedRatings.length).toFixed(1)
        : formatReputation(currentUser?.reputation)
    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', padding: '2rem 1.25rem' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ marginBottom: '1.75rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.25rem' }}>Ratings and Reviews</h1>
                    <p style={{ color: 'var(--gray)', fontSize: '0.9375rem' }}>Rate your partners after completed sessions and view your own reviews</p>
                </div>
                {/* Error */}
                {error ? (
                    <div style={{ padding: '0.875rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: '1.25rem' }}>
                        <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{error}</p>
                    </div>
                ) : null}
                {/* Reputation card */}
                <div style={{ background: 'white', borderRadius: 15, padding: '1.5rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 90, height: 90, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', borderRadius: '50%', color: 'white', flexShrink: 0 }}>
                        <span style={{ fontSize: '1.75rem', fontWeight: 800, lineHeight: 1 }}>{avgRating}</span>
                        <span style={{ fontSize: '0.6875rem', opacity: 0.85, marginTop: 2 }}>out of 5</span>
                    </div>
                    <div>
                        <p style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.375rem' }}>Your Reputation Score</p>
                        <div style={{ display: 'flex', gap: 2, marginBottom: '0.375rem' }}>
                            {[1, 2, 3, 4, 5].map(function(star) {
                                const filled = star <= Math.round(currentUser?.reputation || 0)
                                return (
                                    <span key={star} style={{ fontSize: '1.125rem', color: filled ? '#f59e0b' : '#e2e8f0' }}>
                                        {filled ? '★' : '☆'}
                                    </span>
                                )
                            })}
                        </div>
                        <p style={{ fontSize: '0.875rem', color: 'var(--gray)' }}>
                            {'Based on ' + receivedRatings.length + (receivedRatings.length === 1 ? ' review' : ' reviews')}
                        </p>
                    </div>
                    <div className="ratings-rep-stats" style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark)' }}>{pendingSessions.length}</p>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--gray)' }}>Pending</p>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark)' }}>{receivedRatings.length}</p>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--gray)' }}>Received</p>
                        </div>
                    </div>
                </div>
                {/* Tabs */}
                <div style={{ borderBottom: '2px solid #f1f5f9', marginBottom: '1.5rem', display: 'flex' }}>
                    {[
                        { id: 'pending',  label: 'Pending Ratings (' + pendingSessions.length + ')' },
                        { id: 'received', label: 'Received (' + receivedRatings.length + ')' },
                    ].map(function(tab) {
                        const active = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{ padding: '0.75rem 1.5rem', border: 'none', background: 'none', color: active ? '#2563eb' : 'var(--gray)', fontWeight: 600, cursor: 'pointer', fontSize: '0.9375rem', position: 'relative', borderBottom: active ? '3px solid #2563eb' : '3px solid transparent', marginBottom: -2, transition: 'color 0.2s' }}
                            >
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
                {/* Pending tab */}
                {activeTab === 'pending' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {loadingSessions ? (
                            <div style={{ textAlign: 'center', padding: '3rem' }}>
                                <Spinner size="lg" />
                            </div>
                        ) : pendingSessions.length === 0 ? (
                            <div style={{ background: 'white', borderRadius: 15, padding: '2rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                                <EmptyState
                                    icon="★"
                                    title="No pending ratings"
                                    message="You are all caught up! Complete sessions to leave ratings for your partners."
                                />
                            </div>
                        ) : (
                            pendingSessions.map(function(session) {
                                const isTeacher  = session.teacherId?._id === currentUser?._id
                                const partner    = isTeacher ? session.learnerId : session.teacherId
                                const form       = ratingForms[session._id] || { rating: 0, comment: '' }
                                const submitting = submittingId === session._id
                                const starLabel  = form.rating > 0 ? STAR_LABELS[form.rating] : ''
                                return (
                                    <div key={session._id} style={{ background: 'white', borderRadius: 15, padding: '1.5rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #f1f5f9' }}>
                                            <img
                                                src={getAvatarUrl(partner?.avatar, partner?.fullName)}
                                                alt={partner?.fullName}
                                                style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', background: '#e2e8f0', border: '2px solid #f1f5f9', flexShrink: 0 }}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontWeight: 700, color: 'var(--dark)', fontSize: '1rem' }}>{session.title}</p>
                                                <p style={{ fontSize: '0.8125rem', color: 'var(--gray)', marginTop: 2 }}>
                                                    {'with '}
                                                    <Link to={'/profile/' + partner?._id} style={{ color: 'var(--primary)', fontWeight: 500, textDecoration: 'none' }}>
                                                        {partner?.fullName}
                                                    </Link>
                                                    {' · ' + (isTeacher ? 'You taught' : 'You learned')}
                                                </p>
                                            </div>
                                        </div>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', fontWeight: 600, color: 'var(--dark)', fontSize: '0.9375rem', marginBottom: '0.5rem' }}>
                                                {'How was your experience with ' + (partner?.fullName || 'your partner') + '?'}
                                            </label>
                                            <StarPicker
                                                value={form.rating}
                                                onChange={function(val) { handleRatingChange(session._id, 'rating', val) }}
                                            />
                                            {starLabel ? (
                                                <p style={{ fontSize: '0.8125rem', color: 'var(--gray)', marginTop: 4 }}>{starLabel}</p>
                                            ) : null}
                                        </div>
                                        <div style={{ marginBottom: '1.25rem' }}>
                                            <label style={{ display: 'block', fontWeight: 500, color: 'var(--dark)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                                                {'Leave a comment '}
                                                <span style={{ color: 'var(--gray)', fontWeight: 400 }}>(optional)</span>
                                            </label>
                                            <textarea
                                                rows={3}
                                                placeholder={'Share your experience with ' + (partner?.fullName || 'your partner') + '...'}
                                                className="input"
                                                style={{ resize: 'none' }}
                                                value={form.comment}
                                                onChange={function(e) { handleRatingChange(session._id, 'comment', e.target.value) }}
                                            />
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => handleSubmit(session)}
                                                disabled={submitting || form.rating === 0}
                                                style={{ padding: '0.625rem 1.5rem', background: form.rating === 0 ? '#e2e8f0' : 'var(--primary)', color: form.rating === 0 ? 'var(--gray)' : 'white', border: 'none', borderRadius: 8, fontSize: '0.9375rem', fontWeight: 600, cursor: (submitting || form.rating === 0) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s' }}
                                            >
                                                {submitting ? <><Spinner size="sm" /> Submitting...</> : 'Submit Rating'}
                                            </button>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                ) : null}
                {/* Received tab */}
                {activeTab === 'received' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {loadingRatings ? (
                            <div style={{ textAlign: 'center', padding: '3rem' }}>
                                <Spinner size="lg" />
                            </div>
                        ) : receivedRatings.length === 0 ? (
                            <div style={{ background: 'white', borderRadius: 15, padding: '2rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                                <EmptyState
                                    icon="💬"
                                    title="No reviews yet"
                                    message="Complete sessions and ask your partners to rate you to build your reputation."
                                />
                            </div>
                        ) : (
                            receivedRatings.map(function(rating) {
                                return (
                                    <div key={rating._id} style={{ background: 'white', borderRadius: 15, padding: '1.5rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                            <img
                                                src={getAvatarUrl(rating.reviewerId?.avatar, rating.reviewerId?.fullName)}
                                                alt={rating.reviewerId?.fullName}
                                                style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', background: '#e2e8f0', border: '2px solid #f1f5f9', flexShrink: 0 }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.375rem' }}>
                                                    <Link
                                                        to={'/profile/' + rating.reviewerId?._id}
                                                        style={{ fontWeight: 700, color: 'var(--dark)', fontSize: '0.9375rem', textDecoration: 'none' }}
                                                    >
                                                        {rating.reviewerId?.fullName}
                                                    </Link>
                                                    <span style={{ fontSize: '0.8125rem', color: 'var(--gray)' }}>
                                                        {timeAgo(rating.createdAt)}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: '0.5rem' }}>
                                                    {[1, 2, 3, 4, 5].map(function(star) {
                                                        return (
                                                            <span key={star} style={{ fontSize: '1rem', color: star <= rating.rating ? '#f59e0b' : '#e2e8f0' }}>
                                                                {star <= rating.rating ? '★' : '☆'}
                                                            </span>
                                                        )
                                                    })}
                                                    <span style={{ fontSize: '0.8125rem', color: 'var(--gray)', marginLeft: 4 }}>
                                                        {rating.rating + '/5'}
                                                    </span>
                                                </div>
                                                {rating.comment ? (
                                                    <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: 8, border: '1px solid #f1f5f9' }}>
                                                        <p style={{ fontSize: '0.9rem', color: 'var(--dark)', lineHeight: 1.6, fontStyle: 'italic' }}>
                                                            {'"' + rating.comment + '"'}
                                                        </p>
                                                    </div>
                                                ) : null}
                                                {rating.sessionId?.title ? (
                                                    <p style={{ fontSize: '0.8125rem', color: 'var(--gray)', marginTop: '0.5rem' }}>
                                                        {'Session: ' + rating.sessionId.title}
                                                    </p>
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
export default RatingsPage