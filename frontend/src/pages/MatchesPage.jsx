import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '../features/auth/authSlice'
import api from '../api/axios'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { getAvatarUrl, formatReputation, filterSkillsByType } from '../utils/helpers'

const MatchesPage = function() {
    const currentUser = useSelector(selectCurrentUser)
    const navigate    = useNavigate()
    const [matches,       setMatches]       = useState([])
    const [loading,       setLoading]       = useState(true)
    const [error,         setError]         = useState(null)
    const [requestStates, setRequestStates] = useState({})

    useEffect(function() {
        const fetchAll = async function() {
            setLoading(true)
            setError(null)
            try {
                const [matchRes, sentRes, incomingRes] = await Promise.allSettled([
                    api.get('/matches'),
                    api.get('/requests/sent'),
                    api.get('/requests/incoming'),
                ])

                const matchList    = matchRes.status    === 'fulfilled' ? matchRes.value.data.matches      || [] : []
                const sentList     = sentRes.status     === 'fulfilled' ? sentRes.value.data.requests     || [] : []
                const incomingList = incomingRes.status === 'fulfilled' ? incomingRes.value.data.requests || [] : []

                const states = {}
                sentList.forEach(function(req) {
                    const id = req.receiverId?._id || req.receiverId
                    if (req.status === 'pending')  states[id] = 'sent'
                    if (req.status === 'accepted') states[id] = 'accepted'
                    if (req.status === 'declined') states[id] = 'declined'
                })
                incomingList.forEach(function(req) {
                    const id = req.senderId?._id || req.senderId
                    if (!states[id]) states[id] = 'incoming'
                })

                setRequestStates(states)
                setMatches(matchList)
            } catch {
                setError('Failed to load matches')
            } finally {
                setLoading(false)
            }
        }
        fetchAll()
    }, [])

    const handleConnect = async function(userId, userName) {
        setRequestStates(function(prev) { return { ...prev, [userId]: 'loading' } })
        try {
            await api.post('/requests/' + userId, {
                message: 'Hi ' + userName + ', I would love to exchange skills with you!'
            })
            setRequestStates(function(prev) { return { ...prev, [userId]: 'sent' } })
        } catch (err) {
            const msg = err.response?.data?.message || ''
            if (msg.toLowerCase().includes('already')) {
                setRequestStates(function(prev) { return { ...prev, [userId]: 'sent' } })
            } else {
                setRequestStates(function(prev) { return { ...prev, [userId]: 'error' } })
                setTimeout(function() {
                    setRequestStates(function(prev) { return { ...prev, [userId]: null } })
                }, 3000)
            }
        }
    }

    const renderConnectButton = function(userId, userName) {
        const state = requestStates[userId]

        if (state === 'incoming') {
            return (
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ padding: '0.4375rem 0.875rem', background: '#eff6ff', color: '#1d4ed8', border: '1.5px solid #bfdbfe', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600 }}>
                        Sent you a request
                    </span>
                    <Link
                        to="/requests"
                        className="matches-btn"
                        style={{ padding: '0.4375rem 1rem', background: '#2563eb', color: 'white', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 600, textDecoration: 'none' }}
                    >
                        View in Requests
                    </Link>
                </div>
            )
        }

        if (state === 'loading') {
            return (
                <button disabled className="matches-btn" style={{ padding: '0.4375rem 1.125rem', background: '#e2e8f0', color: '#64748b', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                    <Spinner size="sm" /> Sending...
                </button>
            )
        }

        if (state === 'sent') {
            return (
                <button disabled className="matches-btn" style={{ padding: '0.4375rem 1.125rem', background: '#d1fae5', color: '#065f46', border: '1.5px solid #6ee7b7', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'default' }}>
                    Request Sent
                </button>
            )
        }

        if (state === 'accepted') {
            return (
                <button
                    onClick={function() { navigate('/messages') }}
                    className="matches-btn"
                    style={{ padding: '0.4375rem 1.125rem', background: '#dbeafe', color: '#1d4ed8', border: '1.5px solid #93c5fd', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                    Send Message
                </button>
            )
        }

        if (state === 'declined') {
            return (
                <button disabled className="matches-btn" style={{ padding: '0.4375rem 1.125rem', background: '#fee2e2', color: '#991b1b', border: '1.5px solid #fca5a5', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'default' }}>
                    Request Declined
                </button>
            )
        }

        if (state === 'error') {
            return (
                <button
                    onClick={function() { handleConnect(userId, userName) }}
                    className="matches-btn"
                    style={{ padding: '0.4375rem 1.125rem', background: '#fee2e2', color: '#dc2626', border: '1.5px solid #fca5a5', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                    Try Again
                </button>
            )
        }

        return (
            <button
                onClick={function() { handleConnect(userId, userName) }}
                className="matches-btn"
                style={{ padding: '0.4375rem 1.125rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s' }}
            >
                Connect
            </button>
        )
    }

    if (loading) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <Spinner size="lg" />
                    <p style={{ color: '#64748b', marginTop: '0.75rem', fontSize: '0.9375rem' }}>Finding your best matches...</p>
                </div>
            </div>
        )
    }

    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', padding: '2rem 1.25rem' }}>
            {/* Responsive rules — inline styles can't do media queries, so this
                small stylesheet handles the mobile breakpoint for match cards. */}
            <style>{`
                .matches-card {
                    background: white;
                    border-radius: 15px;
                    padding: 1.25rem 1.5rem;
                    box-shadow: 0 5px 15px rgba(0,0,0,0.05);
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    flex-wrap: wrap;
                    transition: all 0.3s;
                }
                .matches-info {
                    flex: 1 1 240px;
                    min-width: 0;
                }
                .matches-score {
                    text-align: center;
                    flex-shrink: 0;
                }
                .matches-buttons {
                    display: flex;
                    gap: 0.625rem;
                    flex-wrap: wrap;
                }
                .matches-btn {
                    flex: none;
                    text-align: center;
                    white-space: nowrap;
                }

                @media (max-width: 640px) {
                    .matches-card {
                        flex-direction: column;
                        align-items: stretch;
                        padding: 1.25rem;
                        text-align: center;
                    }
                    .matches-card-header {
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                    }
                    .matches-avatar {
                        align-self: center;
                    }
                    .matches-tags {
                        justify-content: center;
                    }
                    .matches-reputation {
                        justify-content: center;
                    }
                    .matches-score {
                        order: -1;
                        align-self: center;
                    }
                    .matches-buttons {
                        width: 100%;
                    }
                    .matches-btn {
                        flex: 1 1 140px !important;
                    }
                }
            `}</style>

            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Skill Matches</h1>
                        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
                            {matches.length > 0
                                ? matches.length + ' potential partners found, ranked by compatibility'
                                : 'Add skills to your profile to find compatible partners'
                            }
                        </p>
                    </div>
                    <Link to="/profile/edit" style={{ padding: '0.5625rem 1.125rem', border: '1.5px solid #e2e8f0', background: 'white', color: '#1e293b', borderRadius: 8, fontSize: '0.875rem', fontWeight: 500, textDecoration: 'none' }}>
                        Update Skills
                    </Link>
                </div>

                {/* Tip */}
                <div style={{ padding: '1rem 1.25rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, marginBottom: '1.75rem', display: 'flex', alignItems: 'flex-start', gap: '0.875rem' }}>
                    <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>💡</span>
                    <div>
                        <p style={{ fontWeight: 600, color: '#1d4ed8', fontSize: '0.9rem', marginBottom: 2 }}>How connecting works</p>
                        <p style={{ color: '#3b82f6', fontSize: '0.875rem', lineHeight: 1.6 }}>
                            Click <strong>Connect</strong> to send a request. The other person sees it in <strong>Requests → Incoming</strong> and can accept or decline. If they already sent YOU a request, you will see <strong>View in Requests</strong> instead.
                        </p>
                    </div>
                </div>

                {/* Banner */}
                {matches.length > 0 ? (
                    <div style={{ background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)', borderRadius: 15, padding: '1.5rem 2rem', marginBottom: '1.75rem', display: 'flex', alignItems: 'center', gap: '2rem', flexWrap: 'wrap', color: 'white' }}>
                        <div>
                            <p style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1 }}>{matches.length}</p>
                            <p style={{ fontSize: '0.875rem', opacity: 0.85, marginTop: 4 }}>Potential Matches</p>
                        </div>
                        <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.2)' }} />
                        <p style={{ fontSize: '0.9rem', opacity: 0.9 }}>AI-powered compatibility ranking based on your teach and learn skills</p>
                    </div>
                ) : null}

                {/* Error */}
                {error ? (
                    <div style={{ padding: '0.875rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: '1.25rem' }}>
                        <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{error}</p>
                    </div>
                ) : null}

                {/* Empty */}
                {!error && matches.length === 0 ? (
                    <div style={{ background: 'white', borderRadius: 15, padding: '2rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                        <EmptyState
                            icon="🤝"
                            title="No matches found yet"
                            message="Add at least one teaching skill and one learning skill to find compatible partners."
                            action={() => navigate('/profile/edit')}
                            actionLabel="Add Skills"
                        />
                    </div>
                ) : null}

                {/* Match cards */}
                {matches.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {matches.map(function(match) {
                            const matchUser = match.user
                            const score     = match.compatibilityScore
                            const state     = requestStates[matchUser._id]

                            const myLearnNames = new Set(
                                filterSkillsByType(currentUser?.skills, 'learn').map(function(s) { return s.skillId?.name?.toLowerCase() })
                            )
                            const myTeachNames = new Set(
                                filterSkillsByType(currentUser?.skills, 'teach').map(function(s) { return s.skillId?.name?.toLowerCase() })
                            )
                            const theirTeach = filterSkillsByType(matchUser.skills, 'teach')
                            const theirLearn = filterSkillsByType(matchUser.skills, 'learn')

                            return (
                                <div
                                    key={matchUser._id}
                                    className="matches-card"
                                    onMouseEnter={function(e) { e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                                    onMouseLeave={function(e) { e.currentTarget.style.boxShadow = '0 5px 15px rgba(0,0,0,0.05)'; e.currentTarget.style.transform = 'translateY(0)' }}
                                >
                                    <img
                                        className="matches-avatar"
                                        src={getAvatarUrl(matchUser.avatar, matchUser.fullName)}
                                        alt={matchUser.fullName}
                                        style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', background: '#e2e8f0', flexShrink: 0, border: '3px solid #f1f5f9' }}
                                    />

                                    <div className="matches-info">
                                        <div className="matches-card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                                            <Link
                                                to={'/profile/' + matchUser._id}
                                                style={{ fontWeight: 700, fontSize: '1.0625rem', color: '#1e293b', textDecoration: 'none' }}
                                                onMouseEnter={function(e) { e.currentTarget.style.color = '#2563eb' }}
                                                onMouseLeave={function(e) { e.currentTarget.style.color = '#1e293b' }}
                                            >
                                                {matchUser.fullName}
                                            </Link>
                                            {matchUser.headline ? (
                                                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{matchUser.headline}</span>
                                            ) : null}
                                        </div>

                                        <div className="matches-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: '0.625rem' }}>
                                            {theirTeach.map(function(s) {
                                                const mutual = myLearnNames.has(s.skillId?.name?.toLowerCase())
                                                return (
                                                    <span key={s.skillId._id} style={{ padding: '0.1875rem 0.75rem', borderRadius: 20, fontSize: '0.8125rem', fontWeight: 500, background: mutual ? '#dbeafe' : '#eff6ff', color: mutual ? '#1d4ed8' : '#3b82f6', border: mutual ? '1px solid #bfdbfe' : 'none', whiteSpace: 'nowrap' }}>
                                                        {'Teaches: ' + s.skillId.name}
                                                    </span>
                                                )
                                            })}
                                            {theirLearn.map(function(s) {
                                                const mutual = myTeachNames.has(s.skillId?.name?.toLowerCase())
                                                return (
                                                    <span key={s.skillId._id} style={{ padding: '0.1875rem 0.75rem', borderRadius: 20, fontSize: '0.8125rem', background: mutual ? '#f0fdf4' : '#f8fafc', color: mutual ? '#16a34a' : '#1e293b', border: mutual ? '1px solid #bbf7d0' : '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>
                                                        {'Wants: ' + s.skillId.name}
                                                    </span>
                                                )
                                            })}
                                        </div>

                                        <p className="matches-reputation" style={{ fontSize: '0.8125rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, marginBottom: '0.875rem' }}>
                                            <span style={{ color: '#f59e0b' }}>★</span>
                                            {formatReputation(matchUser.reputation) + ' reputation'}
                                        </p>

                                        {state === 'sent' ? (
                                            <div style={{ padding: '0.5rem 0.75rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, marginBottom: '0.75rem' }}>
                                                <p style={{ fontSize: '0.8125rem', color: '#059669', fontWeight: 500 }}>Request sent — they will see it in Requests → Incoming</p>
                                            </div>
                                        ) : null}

                                        {state === 'accepted' ? (
                                            <div style={{ padding: '0.5rem 0.75rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, marginBottom: '0.75rem' }}>
                                                <p style={{ fontSize: '0.8125rem', color: '#1d4ed8', fontWeight: 500 }}>Connected! You can now message and schedule sessions.</p>
                                            </div>
                                        ) : null}

                                        {state === 'incoming' ? (
                                            <div style={{ padding: '0.5rem 0.75rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: '0.75rem' }}>
                                                <p style={{ fontSize: '0.8125rem', color: '#92400e', fontWeight: 500 }}>This person already sent you a request! Go to Requests → Incoming to accept.</p>
                                            </div>
                                        ) : null}

                                        <div className="matches-buttons">
                                            {renderConnectButton(matchUser._id, matchUser.fullName)}
                                            <Link
                                                to={'/profile/' + matchUser._id}
                                                className="matches-btn"
                                                style={{ padding: '0.4375rem 1.125rem', background: 'white', color: '#2563eb', border: '1.5px solid #2563eb', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none' }}
                                            >
                                                View Profile
                                            </Link>
                                        </div>
                                    </div>

                                    {score !== null ? (
                                        <div className="matches-score">
                                            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', fontWeight: 800, marginBottom: 6, boxShadow: '0 4px 12px rgba(37,99,235,0.3)' }}>
                                                {score + '%'}
                                            </div>
                                            <p style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 500 }}>Match Score</p>
                                        </div>
                                    ) : null}
                                </div>
                            )
                        })}
                    </div>
                ) : null}
            </div>
        </div>
    )
}

export default MatchesPage