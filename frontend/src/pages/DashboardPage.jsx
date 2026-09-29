import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '../features/auth/authSlice'
import api from '../api/axios'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import BadgesSection from '../components/ui/BadgesSection'
import {
    formatDateTime,
    formatDuration,
    getAvatarUrl,
    formatReputation,
    filterSkillsByType,
    timeAgo,
} from '../utils/helpers'

const DashboardPage = () => {
    const user     = useSelector(selectCurrentUser)
    const navigate = useNavigate()
    const [upcomingSessions, setUpcomingSessions] = useState([])
    const [recentMatches,    setRecentMatches]    = useState([])
    const [incomingRequests, setIncomingRequests] = useState([])
    const [loading,          setLoading]          = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const [sessionsRes, matchesRes, requestsRes] = await Promise.allSettled([
                    api.get('/sessions/upcoming'),
                    api.get('/matches'),
                    api.get('/requests/incoming'),
                ])
                if (sessionsRes.status === 'fulfilled') setUpcomingSessions(sessionsRes.value.data.sessions?.slice(0, 3) || [])
                if (matchesRes.status === 'fulfilled')  setRecentMatches(matchesRes.value.data.matches?.slice(0, 4) || [])
                if (requestsRes.status === 'fulfilled') setIncomingRequests(requestsRes.value.data.requests?.slice(0, 3) || [])
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    const handleAccept = async (requestId) => {
        try {
            await api.put('/requests/' + requestId + '/accept')
            setIncomingRequests((prev) => prev.filter((r) => r._id !== requestId))
        } catch (err) { console.error(err) }
    }

    const handleDecline = async (requestId) => {
        try {
            await api.put('/requests/' + requestId + '/decline')
            setIncomingRequests((prev) => prev.filter((r) => r._id !== requestId))
        } catch (err) { console.error(err) }
    }

    const teachSkills = filterSkillsByType(user?.skills, 'teach')
    const learnSkills = filterSkillsByType(user?.skills, 'learn')

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })

    if (loading) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <Spinner size="lg" className="text-primary-600" />
                    <p style={{ color: 'var(--gray)', marginTop: '0.75rem', fontSize: '0.9375rem' }}>
                        Loading your dashboard...
                    </p>
                </div>
            </div>
        )
    }

    const profileCompletion = user?.profileCompletion ?? 0
    const profileIncomplete = profileCompletion < 100
    const missingHeadline   = !user?.headline
    const missingTeachSkill = teachSkills.length === 0
    const missingLearnSkill = learnSkills.length === 0
    const missingAvatar     = !user?.avatar

    // Stat card config
    const stats = [
        {
            icon: '📅',
            label: 'Upcoming Sessions',
            value: upcomingSessions.length,
            sub: null,
            color: '#2563eb',
            bg: '#eff6ff',
        },
        {
            icon: '📨',
            label: 'Pending Requests',
            value: incomingRequests.length,
            sub: null,
            color: '#7c3aed',
            bg: '#f5f3ff',
        },
        {
            icon: '🎓',
            label: 'Skills Teaching',
            value: teachSkills.length,
            sub: null,
            color: '#059669',
            bg: '#ecfdf5',
        },
        {
            icon: '⭐',
            label: 'Reputation',
            value: formatReputation(user?.reputation),
            sub: 'out of 5.0',
            color: '#d97706',
            bg: '#fffbeb',
        },
    ]

    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', padding: '1.5rem 1rem' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>

                {/* ── Header ── */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
                    <div>
                        <h1 style={{ fontSize: 'clamp(1.375rem, 4vw, 1.75rem)', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.25rem' }}>
                            {'Welcome back, ' + (user?.fullName?.split(' ')[0] || 'User') + '!'}
                        </h1>
                        <p style={{ color: 'var(--gray)', fontSize: '0.9rem' }}>
                            Here's what's happening with your skill exchange journey
                        </p>
                    </div>
                    <div className="dashboard-date-badge" style={{ background: 'white', padding: '0.5rem 1rem', borderRadius: 8, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', fontSize: '0.8125rem', color: 'var(--gray)', fontWeight: 500, flexShrink: 0 }}>
                        {today}
                    </div>
                </div>

                {/* ── Stats Grid (Task 1: improved cards) ── */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.75rem' }}>
                    {stats.map(function(stat) {
                        return (
                            <div
                                key={stat.label}
                                style={{
                                    background: 'white',
                                    borderRadius: 14,
                                    padding: '1.25rem 1.125rem',
                                    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.875rem',
                                    border: '1px solid #f1f5f9',
                                    minHeight: 130,
                                    justifyContent: 'space-between',
                                }}
                            >
                                {/* Icon pill */}
                                <div style={{
                                    width: 44,
                                    height: 44,
                                    borderRadius: 12,
                                    background: stat.bg,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '1.25rem',
                                    flexShrink: 0,
                                }}>
                                    {stat.icon}
                                </div>

                                {/* Text */}
                                <div>
                                    <p style={{
                                        fontSize: '0.8rem',
                                        color: 'var(--gray)',
                                        fontWeight: 500,
                                        marginBottom: '0.3rem',
                                        lineHeight: 1.3,
                                        letterSpacing: '0.01em',
                                    }}>
                                        {stat.label}
                                    </p>
                                    <p style={{
                                        fontSize: 'clamp(1.625rem, 4vw, 2rem)',
                                        fontWeight: 700,
                                        color: stat.color,
                                        lineHeight: 1,
                                        fontVariantNumeric: 'tabular-nums',
                                    }}>
                                        {stat.value}
                                    </p>
                                    {stat.sub ? (
                                        <p style={{ fontSize: '0.6875rem', color: 'var(--gray)', marginTop: '0.25rem' }}>
                                            {stat.sub}
                                        </p>
                                    ) : null}
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* ── Main grid: 2/3 + 1/3 ── */}
                <div className="dashboard-main-grid" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>

                    {/* ── Upcoming Sessions ── */}
                    <div style={{ background: 'white', borderRadius: 15, padding: '1.375rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.125rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--dark)' }}>
                                Upcoming Sessions
                            </h3>
                            <Link to="/sessions" style={{ color: 'var(--primary)', fontSize: '0.8125rem', fontWeight: 500, textDecoration: 'none' }}>
                                View All
                            </Link>
                        </div>
                        {upcomingSessions.length === 0 ? (
                            <EmptyState
                                icon="📅"
                                title="No upcoming sessions"
                                message="Schedule a session with one of your matches to get started."
                                action={() => navigate('/matches')}
                                actionLabel="Find Matches"
                            />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {upcomingSessions.map(function(session) {
                                    const isTeacher = session.teacherId?._id === user?._id
                                    const partner   = isTeacher ? session.learnerId : session.teacherId
                                    const d         = new Date(session.date)
                                    const day       = d.getDate()
                                    const month     = d.toLocaleString('default', { month: 'short' }).toUpperCase()
                                    const isPending = session.status === 'pending_approval'
                                    return (
                                        <div key={session._id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.875rem', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                                            <div style={{ textAlign: 'center', minWidth: 46, flexShrink: 0 }}>
                                                <p style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--primary)', lineHeight: 1 }}>{day}</p>
                                                <p style={{ fontSize: '0.625rem', color: 'var(--gray)', textTransform: 'uppercase', fontWeight: 600 }}>{month}</p>
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{ fontWeight: 600, color: 'var(--dark)', fontSize: '0.9rem', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {session.title}
                                                </p>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--gray)' }}>
                                                    {'with ' + (partner?.fullName || 'Unknown') + ' · ' + (isTeacher ? 'Teaching' : 'Learning')}
                                                </p>
                                                <p style={{ fontSize: '0.8rem', color: 'var(--gray)', marginTop: 1 }}>
                                                    {formatDateTime(session.date) + ' · ' + formatDuration(session.duration)}
                                                </p>
                                                {isPending ? (
                                                    <p style={{ fontSize: '0.75rem', color: '#92400e', marginTop: 2, fontWeight: 500 }}>
                                                        Awaiting confirmation
                                                    </p>
                                                ) : null}
                                            </div>
                                            {!isPending ? (
                                                <Link
                                                    to={'/session-room/' + session._id}
                                                    style={{ padding: '0.4375rem 0.875rem', background: 'var(--primary)', color: 'white', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}
                                                >
                                                    Join
                                                </Link>
                                            ) : (
                                                <Link
                                                    to="/sessions"
                                                    style={{ padding: '0.4375rem 0.875rem', background: '#f1f5f9', color: '#64748b', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}
                                                >
                                                    View
                                                </Link>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── Incoming Requests ── */}
                    <div style={{ background: 'white', borderRadius: 15, padding: '1.375rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.125rem' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--dark)' }}>
                                Requests
                            </h3>
                            <Link to="/requests" style={{ color: 'var(--primary)', fontSize: '0.8125rem', fontWeight: 500, textDecoration: 'none' }}>
                                View All
                            </Link>
                        </div>
                        {incomingRequests.length === 0 ? (
                            <EmptyState
                                icon="📨"
                                title="No pending requests"
                                message="Connection requests from other users will appear here."
                            />
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {incomingRequests.map(function(request) {
                                    const sender = request.senderId
                                    return (
                                        <div key={request._id} style={{ padding: '0.875rem', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.625rem' }}>
                                                <img
                                                    src={getAvatarUrl(sender?.avatar, sender?.fullName)}
                                                    alt={sender?.fullName}
                                                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', background: '#f1f5f9', flexShrink: 0 }}
                                                />
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {sender?.fullName}
                                                    </p>
                                                    <p style={{ fontSize: '0.75rem', color: 'var(--gray)' }}>
                                                        {timeAgo(request.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                            {request.message && (
                                                <p style={{ fontSize: '0.8rem', color: 'var(--gray)', fontStyle: 'italic', marginBottom: '0.625rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {'"' + request.message + '"'}
                                                </p>
                                            )}
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button
                                                    onClick={() => handleAccept(request._id)}
                                                    style={{ flex: 1, padding: '0.4375rem', background: 'var(--success)', color: 'white', border: 'none', borderRadius: 7, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                                                >
                                                    Accept
                                                </button>
                                                <button
                                                    onClick={() => handleDecline(request._id)}
                                                    style={{ flex: 1, padding: '0.4375rem', background: 'white', color: 'var(--danger)', border: '1.5px solid var(--danger)', borderRadius: 7, fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}
                                                >
                                                    Decline
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* ── Recent Matches ── */}
                <div style={{ background: 'white', borderRadius: 15, padding: '1.375rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)', marginBottom: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.125rem' }}>
                        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--dark)' }}>
                            Recent Matches
                        </h3>
                        <Link to="/matches" style={{ color: 'var(--primary)', fontSize: '0.8125rem', fontWeight: 500, textDecoration: 'none' }}>
                            View All
                        </Link>
                    </div>
                    {recentMatches.length === 0 ? (
                        <EmptyState
                            icon="🤝"
                            title="No matches found yet"
                            message="Add skills to your profile to find compatible skill exchange partners."
                            action={() => navigate('/profile/edit')}
                            actionLabel="Add Skills"
                        />
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {recentMatches.map(function(match) {
                                const matchUser        = match.user
                                const teachSkillsMatch = filterSkillsByType(matchUser?.skills, 'teach')
                                const learnSkillsMatch = filterSkillsByType(matchUser?.skills, 'learn')
                                const score            = match.compatibilityScore
                                return (
                                    <div key={matchUser?._id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: '#f8fafc', borderRadius: 10, border: '1px solid #f1f5f9' }}>
                                        <img
                                            src={getAvatarUrl(matchUser?.avatar, matchUser?.fullName)}
                                            alt={matchUser?.fullName}
                                            style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', background: '#e2e8f0', flexShrink: 0 }}
                                        />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontWeight: 600, color: 'var(--dark)', fontSize: '0.9375rem', marginBottom: 4 }}>
                                                {matchUser?.fullName}
                                            </p>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                                {teachSkillsMatch.slice(0, 2).map(function(s) {
                                                    return (
                                                        <span key={s.skillId._id} style={{ padding: '0.1875rem 0.625rem', borderRadius: 20, fontSize: '0.75rem', background: '#dbeafe', color: '#1d4ed8', fontWeight: 500 }}>
                                                            {'Teaches: ' + s.skillId.name}
                                                        </span>
                                                    )
                                                })}
                                                {learnSkillsMatch.slice(0, 1).map(function(s) {
                                                    return (
                                                        <span key={s.skillId._id} style={{ padding: '0.1875rem 0.625rem', borderRadius: 20, fontSize: '0.75rem', background: '#f1f5f9', color: 'var(--dark)' }}>
                                                            {'Wants: ' + s.skillId.name}
                                                        </span>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                        {score !== null && (
                                            <div className="score-circle" style={{ width: 56, height: 56, fontSize: '1rem' }}>
                                                {score + '%'}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* ── Badges (compact) ── */}
                {user?._id && (
                    <div style={{ marginTop: '1.5rem' }}>
                        <BadgesSection userId={user._id} compact />
                    </div>
                )}

                {/* ── Profile completion nudge ── */}
                {profileIncomplete && (
                    <div style={{ background: 'white', borderRadius: 15, padding: '1.25rem 1.375rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)', borderLeft: '4px solid var(--primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                                    <p style={{ fontWeight: 600, color: 'var(--dark)', fontSize: '0.9375rem' }}>
                                        Complete your profile to get better matches
                                    </p>
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary)' }}>
                                        {profileCompletion + '%'}
                                    </span>
                                </div>
                                <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, marginBottom: '0.625rem', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: profileCompletion + '%', background: 'var(--primary)', borderRadius: 3, transition: 'width 0.3s' }} />
                                </div>
                                <p style={{ fontSize: '0.875rem', color: 'var(--gray)', lineHeight: 1.5 }}>
                                    {[
                                        missingAvatar     && 'profile photo',
                                        missingHeadline   && 'headline',
                                        missingTeachSkill && 'at least one skill to teach',
                                        missingLearnSkill && 'at least one skill to learn',
                                    ].filter(Boolean).join(', ').replace(/,([^,]*)$/, ' and$1')
                                        ? 'Add your ' + [
                                            missingAvatar     && 'profile photo',
                                            missingHeadline   && 'headline',
                                            missingTeachSkill && 'at least one skill to teach',
                                            missingLearnSkill && 'at least one skill to learn',
                                        ].filter(Boolean).join(', ').replace(/,([^,]*)$/, ' and$1') + ' to attract the right partners.'
                                        : 'Add more details to attract the right partners.'
                                    }
                                </p>
                            </div>
                            <Link
                                to="/profile/edit"
                                style={{ padding: '0.5rem 1.25rem', background: 'var(--primary)', color: 'white', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none', flexShrink: 0 }}
                            >
                                Complete Profile
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default DashboardPage