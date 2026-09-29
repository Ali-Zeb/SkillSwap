import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectCurrentUser } from '../features/auth/authSlice'
import api from '../api/axios'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import ReportModal from '../components/ui/ReportModal'
import {
    getAvatarUrl,
    formatReputation,
    filterSkillsByType,
    formatDate,
    timeAgo,
} from '../utils/helpers'

const PROFICIENCY_COLORS = {
    beginner:     { bg: '#dbeafe', color: '#1d4ed8' },
    intermediate: { bg: '#e0e7ff', color: '#4338ca' },
    advanced:     { bg: '#fce7f3', color: '#be185d' },
    expert:       { bg: '#d1fae5', color: '#065f46' },
}

const ProfilePage = () => {
    const { id }        = useParams()
    const navigate      = useNavigate()
    const currentUser   = useSelector(selectCurrentUser)
    const [profileUser,    setProfileUser]    = useState(null)
    const [ratings,        setRatings]        = useState([])
    const [loading,        setLoading]        = useState(true)
    const [ratingsLoading, setRatingsLoading] = useState(true)
    const [error,          setError]          = useState(null)
    const [activeTab,      setActiveTab]      = useState('about')
    const [requestSent,    setRequestSent]    = useState(false)
    const [sending,        setSending]        = useState(false)
    const [reportOpen,     setReportOpen]     = useState(false)

    const profileId    = id || currentUser?._id
    const isOwnProfile = !id || id === currentUser?._id

    useEffect(() => {
        const fetchProfile = async () => {
            setLoading(true)
            setError(null)
            try {
                const { data } = await api.get('/users/profile/' + profileId)
                setProfileUser(data.user)
            } catch {
                setError('User not found')
            } finally {
                setLoading(false)
            }
        }
        if (profileId) fetchProfile()
    }, [profileId])

    useEffect(() => {
        const fetchRatings = async () => {
            setRatingsLoading(true)
            try {
                const { data } = await api.get('/ratings/user/' + profileId)
                setRatings(data.ratings || [])
            } catch {
                setRatings([])
            } finally {
                setRatingsLoading(false)
            }
        }
        if (profileId) fetchRatings()
    }, [profileId])

    const handleConnect = async () => {
        setSending(true)
        try {
            await api.post('/requests/' + profileId, {
                message: 'Hi ' + profileUser?.fullName + ', I would love to exchange skills with you!'
            })
            setRequestSent(true)
        } catch (error) {
            console.error('Failed to send connect request:', error.message)
        } finally {
            setSending(false)
        }
    }

    if (loading) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spinner size="lg" />
            </div>
        )
    }

    if (error || !profileUser) {
        return (
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '2rem 1.25rem' }}>
                <div style={{ background: 'white', borderRadius: 15, padding: '2rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                    <EmptyState
                        icon="👤"
                        title="Profile not found"
                        message="This user does not exist or their account is inactive."
                        action={() => navigate('/matches')}
                        actionLabel="Browse Matches"
                    />
                </div>
            </div>
        )
    }

    const teachSkills = filterSkillsByType(profileUser.skills, 'teach')
    const learnSkills = filterSkillsByType(profileUser.skills, 'learn')

    const TABS = [
        { id: 'about',   label: 'About' },
        { id: 'skills',  label: 'Skills (' + profileUser.skills?.length + ')' },
        { id: 'reviews', label: 'Reviews (' + ratings.length + ')' },
    ]

    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', padding: '2rem 1.25rem' }}>
            {/* Responsive rules — inline styles can't do media queries, so this
                small stylesheet handles the mobile breakpoint for the profile page. */}
            <style>{`
                .profile-header {
                    background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
                    padding: 2.5rem;
                    border-radius: 20px;
                    color: white;
                    margin-bottom: 1.75rem;
                    display: flex;
                    align-items: center;
                    gap: 2rem;
                    flex-wrap: wrap;
                    position: relative;
                    overflow: hidden;
                }
                .profile-header-info {
                    flex: 1 1 200px;
                    min-width: 0;
                    position: relative;
                    z-index: 1;
                }
                .profile-header-actions {
                    display: flex;
                    flex-direction: column;
                    gap: 0.625rem;
                    flex-shrink: 0;
                    position: relative;
                    z-index: 1;
                }
                .profile-stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1rem;
                    margin-bottom: 1.75rem;
                }
                .profile-skill-row {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                    padding: 0.75rem 1rem;
                    background: #f8fafc;
                    border-radius: 10px;
                    border: 1px solid #e2e8f0;
                }
                .profile-skill-name {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    min-width: 0;
                }

                @media (max-width: 640px) {
                    .profile-header {
                        padding: 1.75rem 1.5rem;
                        flex-direction: column;
                        text-align: center;
                    }
                    .profile-header-info {
                        flex-basis: 100%;
                        text-align: center;
                    }
                    .profile-header-info > div[style*="inline-flex"] {
                        justify-content: center;
                    }
                    .profile-header-actions {
                        flex-direction: row;
                        width: 100%;
                    }
                    .profile-header-actions > * {
                        flex: 1 1 auto;
                    }
                    .profile-stats-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    .profile-skill-row {
                        justify-content: flex-start;
                    }
                }

                @media (max-width: 400px) {
                    .profile-stats-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>

            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                {/* ── Profile Header ── */}
                <div className="profile-header">
                    {/* Background decoration */}
                    <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, background: 'rgba(255,255,255,0.06)', borderRadius: '50%', pointerEvents: 'none' }} />
                    <div style={{ position: 'absolute', bottom: -30, left: '40%', width: 150, height: 150, background: 'rgba(255,255,255,0.04)', borderRadius: '50%', pointerEvents: 'none' }} />

                    {/* Avatar */}
                    <div style={{
                        width: 110,
                        height: 110,
                        borderRadius: '50%',
                        background: 'white',
                        border: '4px solid rgba(255,255,255,0.4)',
                        overflow: 'hidden',
                        flexShrink: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        zIndex: 1,
                    }}>
                        <img
                            src={getAvatarUrl(profileUser.avatar, profileUser.fullName)}
                            alt={profileUser.fullName}
                            style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block',
                            }}
                            onError={function(e) {
                                e.currentTarget.style.display = 'none'
                                e.currentTarget.parentElement.querySelector('.avatar-fallback').style.display = 'flex'
                            }}
                        />
                        <div
                            className="avatar-fallback"
                            style={{
                                display: 'none',
                                position: 'absolute',
                                inset: 0,
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: '#dbeafe',
                                color: '#1d4ed8',
                                fontSize: '2.5rem',
                                fontWeight: 700,
                            }}
                        >
                            {profileUser.fullName?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                    </div>

                    {/* Info */}
                    <div className="profile-header-info">
                        <h2 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'white', marginBottom: '0.375rem' }}>
                            {profileUser.fullName}
                        </h2>
                        {profileUser.headline && (
                            <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1rem', marginBottom: '0.5rem' }}>
                                {profileUser.headline}
                            </p>
                        )}
                        {profileUser.location && (
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                                {'📍 ' + profileUser.location}
                            </p>
                        )}
                        {/* Reputation badge */}
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', padding: '0.3125rem 0.875rem', borderRadius: 20, fontSize: '0.875rem' }}>
                            <span>⭐</span>
                            <span style={{ fontWeight: 600 }}>{formatReputation(profileUser.reputation)} Reputation</span>
                            {ratings.length > 0 && (
                                <span style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8125rem' }}>
                                    {'· ' + ratings.length + ' reviews'}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="profile-header-actions">
                        {isOwnProfile ? (
                            <>
                                <Link
                                    to="/profile/edit"
                                    style={{ padding: '0.5625rem 1.25rem', background: 'white', color: '#2563eb', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem', textDecoration: 'none', textAlign: 'center' }}
                                >
                                    Edit Profile
                                </Link>
                                <Link
                                    to="/reports"
                                    style={{ padding: '0.5625rem 1.25rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 8, fontWeight: 500, fontSize: '0.9rem', textDecoration: 'none', textAlign: 'center' }}
                                >
                                    My Reports
                                </Link>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={handleConnect}
                                    disabled={sending || requestSent}
                                    style={{ padding: '0.5625rem 1.25rem', background: 'white', color: '#2563eb', borderRadius: 8, fontWeight: 600, fontSize: '0.9rem', border: 'none', cursor: requestSent ? 'default' : 'pointer', opacity: (sending || requestSent) ? 0.8 : 1 }}
                                >
                                    {sending ? 'Sending...' : requestSent ? 'Request Sent' : 'Connect'}
                                </button>
                                <Link
                                    to={'/messages/' + profileUser._id}
                                    style={{ padding: '0.5625rem 1.25rem', background: 'rgba(255,255,255,0.15)', color: 'white', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 8, fontWeight: 500, fontSize: '0.9rem', textDecoration: 'none', textAlign: 'center' }}
                                >
                                    Message
                                </Link>
                                <button
                                    type="button"
                                    onClick={function() { setReportOpen(true) }}
                                    style={{ padding: '0.5625rem 1.25rem', background: 'transparent', color: 'white', border: '1.5px solid rgba(255,255,255,0.4)', borderRadius: 8, fontWeight: 500, fontSize: '0.9rem', cursor: 'pointer' }}
                                >
                                    Report
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* ── Stats row ── */}
                <div className="profile-stats-grid">
                    {[
                        { icon: '🎓', label: 'Teaching',   value: teachSkills.length },
                        { icon: '📖', label: 'Learning',   value: learnSkills.length },
                        { icon: '⭐', label: 'Reputation', value: formatReputation(profileUser.reputation) },
                        { icon: '💬', label: 'Reviews',    value: ratings.length },
                    ].map(function(stat) {
                        return (
                            <div key={stat.label} style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: '0.875rem', minWidth: 0 }}>
                                <div style={{ width: 44, height: 44, background: '#dbeafe', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', flexShrink: 0 }}>
                                    {stat.icon}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                    <p style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--dark)', lineHeight: 1 }}>
                                        {stat.value}
                                    </p>
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--gray)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {stat.label}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {/* ── Tabs ── */}
                <div style={{ borderBottom: '2px solid #f1f5f9', marginBottom: '1.5rem', display: 'flex', gap: 0, overflowX: 'auto' }}>
                    {TABS.map(function(tab) {
                        const active = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                style={{
                                    padding: '0.75rem 1.5rem',
                                    border: 'none',
                                    background: 'none',
                                    color: active ? '#2563eb' : 'var(--gray)',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    fontSize: '0.9375rem',
                                    position: 'relative',
                                    borderBottom: active ? '3px solid #2563eb' : '3px solid transparent',
                                    marginBottom: -2,
                                    transition: 'color 0.2s',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                }}
                            >
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                {/* ── About Tab ── */}
                {activeTab === 'about' && (
                    <div style={{ background: 'white', borderRadius: 15, padding: '1.75rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                        {profileUser.about ? (
                            <div style={{ marginBottom: '1.5rem' }}>
                                <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                    ABOUT
                                </h4>
                                <p style={{ color: 'var(--dark)', lineHeight: 1.7, fontSize: '0.9375rem' }}>
                                    {profileUser.about}
                                </p>
                            </div>
                        ) : (
                            <p style={{ color: 'var(--gray)', fontSize: '0.9375rem', marginBottom: '1.5rem' }}>
                                {isOwnProfile ? 'No bio added yet. Click Edit Profile to add one.' : 'No bio provided.'}
                            </p>
                        )}
                        <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1.25rem' }}>
                            <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--gray)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                                MEMBER SINCE
                            </h4>
                            <p style={{ color: 'var(--dark)', fontSize: '0.9375rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span>🗓</span>
                                {formatDate(profileUser.createdAt)}
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Skills Tab ── */}
                {activeTab === 'skills' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {/* Skills I Teach */}
                        <div style={{ background: 'white', borderRadius: 15, padding: '1.75rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '1.125rem' }}>🎓</span>
                                {'TEACHING (' + teachSkills.length + ')'}
                            </h3>
                            {teachSkills.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {teachSkills.map(function(s) {
                                        const proficiency = s.proficiency || 'intermediate'
                                        const profColor   = PROFICIENCY_COLORS[proficiency] || PROFICIENCY_COLORS.intermediate
                                        return (
                                            <div key={s.skillId._id} className="profile-skill-row">
                                                <div className="profile-skill-name">
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', flexShrink: 0 }} />
                                                    <span style={{ fontWeight: 600, color: 'var(--dark)', fontSize: '0.9375rem' }}>
                                                        {s.skillId.name}
                                                    </span>
                                                    {s.skillId.category && (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--gray)', whiteSpace: 'nowrap' }}>
                                                            {s.skillId.category}
                                                        </span>
                                                    )}
                                                </div>
                                                <span style={{ padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: profColor.bg, color: profColor.color, flexShrink: 0 }}>
                                                    {proficiency.charAt(0).toUpperCase() + proficiency.slice(1)}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p style={{ color: 'var(--gray)', fontSize: '0.9rem' }}>
                                    {isOwnProfile ? 'No teaching skills added yet.' : 'No teaching skills listed.'}
                                </p>
                            )}
                        </div>

                        {/* Skills I Want to Learn */}
                        <div style={{ background: 'white', borderRadius: 15, padding: '1.75rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ fontSize: '1.125rem' }}>📖</span>
                                {'WANTS TO LEARN (' + learnSkills.length + ')'}
                            </h3>
                            {learnSkills.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {learnSkills.map(function(s) {
                                        const proficiency = s.proficiency || 'intermediate'
                                        const profColor   = PROFICIENCY_COLORS[proficiency] || PROFICIENCY_COLORS.intermediate
                                        return (
                                            <div key={s.skillId._id} className="profile-skill-row">
                                                <div className="profile-skill-name">
                                                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', flexShrink: 0 }} />
                                                    <span style={{ fontWeight: 600, color: 'var(--dark)', fontSize: '0.9375rem' }}>
                                                        {s.skillId.name}
                                                    </span>
                                                    {s.skillId.category && (
                                                        <span style={{ fontSize: '0.75rem', color: 'var(--gray)', whiteSpace: 'nowrap' }}>
                                                            {s.skillId.category}
                                                        </span>
                                                    )}
                                                </div>
                                                <span style={{ padding: '0.25rem 0.75rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: profColor.bg, color: profColor.color, flexShrink: 0 }}>
                                                    {proficiency.charAt(0).toUpperCase() + proficiency.slice(1)}
                                                </span>
                                            </div>
                                        )
                                    })}
                                </div>
                            ) : (
                                <p style={{ color: 'var(--gray)', fontSize: '0.9rem' }}>
                                    {isOwnProfile ? 'No learning goals added yet.' : 'No learning goals listed.'}
                                </p>
                            )}
                        </div>

                        {isOwnProfile && (
                            <div style={{ textAlign: 'center' }}>
                                <Link
                                    to="/profile/edit"
                                    style={{ padding: '0.625rem 1.5rem', background: 'var(--primary)', color: 'white', borderRadius: 8, fontWeight: 600, fontSize: '0.9375rem', textDecoration: 'none' }}
                                >
                                    Manage Skills
                                </Link>
                            </div>
                        )}
                    </div>
                )}

                {/* ── Reviews Tab ── */}
                {activeTab === 'reviews' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {ratingsLoading ? (
                            <div style={{ textAlign: 'center', padding: '2rem' }}>
                                <Spinner size="md" />
                            </div>
                        ) : ratings.length === 0 ? (
                            <div style={{ background: 'white', borderRadius: 15, padding: '1.75rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                                <EmptyState
                                    icon="⭐"
                                    title="No reviews yet"
                                    message="Reviews appear here after completed sessions."
                                />
                            </div>
                        ) : (
                            ratings.map(function(rating) {
                                return (
                                    <div key={rating._id} style={{ background: 'white', borderRadius: 15, padding: '1.5rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                                            <img
                                                src={getAvatarUrl(rating.reviewerId?.avatar, rating.reviewerId?.fullName)}
                                                alt={rating.reviewerId?.fullName}
                                                style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', background: '#f1f5f9', flexShrink: 0 }}
                                            />
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.375rem' }}>
                                                    <p style={{ fontWeight: 600, color: 'var(--dark)', fontSize: '0.9375rem' }}>
                                                        {rating.reviewerId?.fullName}
                                                    </p>
                                                    <span style={{ fontSize: '0.8125rem', color: 'var(--gray)' }}>
                                                        {timeAgo(rating.createdAt)}
                                                    </span>
                                                </div>
                                                <div style={{ display: 'flex', gap: 2, marginBottom: '0.5rem' }}>
                                                    {[1,2,3,4,5].map(function(star) {
                                                        return (
                                                            <span key={star} style={{ color: star <= rating.rating ? '#f59e0b' : '#e2e8f0', fontSize: '1rem' }}>
                                                                {star <= rating.rating ? '★' : '☆'}
                                                            </span>
                                                        )
                                                    })}
                                                    <span style={{ fontSize: '0.8125rem', color: 'var(--gray)', marginLeft: 4 }}>
                                                        {rating.rating + '/5'}
                                                    </span>
                                                </div>
                                                {rating.comment && (
                                                    <p style={{ color: 'var(--gray)', fontSize: '0.9rem', lineHeight: 1.6, fontStyle: 'italic' }}>
                                                        {'"' + rating.comment + '"'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                )}
            </div>

            {!isOwnProfile && (
                <ReportModal
                    isOpen={reportOpen}
                    onClose={function() { setReportOpen(false) }}
                    reportedUser={profileUser}
                />
            )}
        </div>
    )
}

export default ProfilePage