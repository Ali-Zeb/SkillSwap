import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import Spinner from './Spinner'
import { formatDate } from '../../utils/helpers'

/**
 * Earned and locked badges with progress, loaded from /api/badges/user/:id.
 *
 * Props:
 *   userId   — whose badges to show
 *   compact  — Dashboard variant: earned icons + closest locked badge
 *   isOwn    — wording for the viewer's own profile
 */
const BadgesSection = function({ userId, compact = false, isOwn = false }) {
    const [data,  setData]  = useState(null)
    const [error, setError] = useState(null)

    useEffect(function() {
        if (!userId) return
        let cancelled = false
        api.get('/badges/user/' + userId)
            .then(function({ data }) { if (!cancelled) setData(data) })
            .catch(function(err) { if (!cancelled) setError(err.response?.data?.message || 'Could not load badges') })
        return function() { cancelled = true }
    }, [userId])

    const card = { background: 'white', borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,0.06)', padding: '1.25rem' }

    if (error) return <div style={card}><p style={{ color: '#b91c1c', margin: 0, fontSize: '0.9rem' }}>{error}</p></div>
    if (!data) return <div style={{ ...card, display: 'flex', justifyContent: 'center' }}><Spinner /></div>

    const earned = data.badges.filter(function(b) { return b.earned })
    const locked = data.badges.filter(function(b) { return !b.earned })

    if (compact) {
        const next = locked.slice().sort(function(a, b) { return b.progress - a.progress })[0]
        return (
            <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem' }}>
                    <h2 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Badges</h2>
                    <Link to="/profile" style={{ fontSize: '0.875rem', color: '#2563eb', textDecoration: 'none', fontWeight: 500 }}>
                        {data.earnedCount}/{data.total} earned →
                    </Link>
                </div>
                {earned.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: next ? '0.875rem' : 0 }}>
                        {earned.map(function(b) {
                            return <span key={b.type} title={b.label} aria-label={b.label} style={{ fontSize: '1.5rem', lineHeight: 1 }}>{b.icon}</span>
                        })}
                    </div>
                ) : (
                    <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 0.875rem' }}>No badges yet — complete sessions to start earning them.</p>
                )}
                {next && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', color: '#334155', marginBottom: 4, gap: '0.5rem' }}>
                            <span>Next: {next.icon} {next.label}</span>
                            <span style={{ color: '#64748b' }}>{Math.round(next.progress * 100)}%</span>
                        </div>
                        <ProgressBar value={next.progress} />
                    </div>
                )}
            </div>
        )
    }

    return (
        <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>Badges</h2>
                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>{data.earnedCount} of {data.total} earned</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {earned.concat(locked).map(function(b) {
                    return (
                        <div key={b.type} style={{ border: '1.5px solid ' + (b.earned ? '#bfdbfe' : '#f1f5f9'), background: b.earned ? '#eff6ff' : '#f8fafc', borderRadius: 10, padding: '0.875rem', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                            <span aria-hidden="true" style={{ fontSize: '1.75rem', lineHeight: 1, filter: b.earned ? 'none' : 'grayscale(1)', opacity: b.earned ? 1 : 0.45 }}>{b.icon}</span>
                            <div style={{ minWidth: 0, flex: 1 }}>
                                <p style={{ fontWeight: 600, color: b.earned ? '#1e293b' : '#475569', margin: 0, fontSize: '0.9375rem' }}>
                                    {b.label} {!b.earned && <span style={{ fontSize: '0.75rem' }} aria-label="locked">🔒</span>}
                                </p>
                                <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '2px 0 0' }}>{b.description}</p>
                                {b.earned ? (
                                    <p style={{ fontSize: '0.75rem', color: '#2563eb', margin: '6px 0 0', fontWeight: 500 }}>Earned {formatDate(b.earnedAt)}</p>
                                ) : (
                                    <div style={{ marginTop: 8 }}>
                                        <ProgressBar value={b.progress} />
                                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '4px 0 0' }}>{b.progressLabel}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
            {isOwn && data.earnedCount === 0 && (
                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '1rem 0 0' }}>Complete sessions and get rated to unlock your first badges.</p>
            )}
        </div>
    )
}

const ProgressBar = function({ value }) {
    const pct = Math.round(Math.max(0, Math.min(1, value)) * 100)
    return (
        <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: pct + '%', height: '100%', background: '#2563eb', borderRadius: 3 }} />
        </div>
    )
}

export default BadgesSection
