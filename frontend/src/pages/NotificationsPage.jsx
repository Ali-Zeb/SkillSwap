import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api/axios'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { timeAgo } from '../utils/helpers'

// Icon map — matches NOTIFICATION_TYPES values from constants.js
const NOTIFICATION_ICONS = {
    request_received:  '🤝',
    request_accepted:  '✅',
    request_declined:  '❌',
    session_proposed:  '📅',
    session_approved:  '🎉',
    session_declined:  '❌',
    session_cancelled: '🚫',
    session_reminder:  '⏰',
    session_completed: '⭐',
    rating_received:   '⭐',
    new_message:       '💬',
    badge_earned:      '🏆',
}

const NotificationsPage = function() {
    const navigate = useNavigate()

    const [notifications, setNotifications] = useState([])
    const [loading,       setLoading]       = useState(true)
    const [error,         setError]         = useState(null)
    const [markingAll,    setMarkingAll]     = useState(false)

    useEffect(function() {
        const fetchNotifications = async function() {
            setLoading(true)
            setError(null)
            try {
                const { data } = await api.get('/notifications?limit=50')
                setNotifications(data.notifications || [])
            } catch {
                setError('Failed to load notifications')
            } finally {
                setLoading(false)
            }
        }
        fetchNotifications()
    }, [])

    const handleMarkAllRead = async function() {
        setMarkingAll(true)
        try {
            await api.put('/notifications/read-all')
            setNotifications(function(prev) {
                return prev.map(function(n) { return { ...n, read: true } })
            })
        } catch {
            // silently ignore — user can retry
        } finally {
            setMarkingAll(false)
        }
    }

    const handleClick = async function(notification) {
        // Mark as read if not already
        if (!notification.read) {
            try {
                await api.put('/notifications/' + notification._id + '/read')
                setNotifications(function(prev) {
                    return prev.map(function(n) {
                        return n._id === notification._id ? { ...n, read: true } : n
                    })
                })
            } catch {
                // Continue navigation even if mark-read fails
            }
        }
        // Navigate to the linked page
        if (notification.link && notification.link !== '/') {
            navigate(notification.link)
        }
    }

    const handleDelete = async function(e, notificationId) {
        // Stop propagation so the card click (navigate) does not also fire
        e.stopPropagation()
        try {
            await api.delete('/notifications/' + notificationId)
            setNotifications(function(prev) {
                return prev.filter(function(n) { return n._id !== notificationId })
            })
        } catch {
            // silently ignore
        }
    }

    const unreadCount = notifications.filter(function(n) { return !n.read }).length

    if (loading) {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                    <Spinner size="lg" />
                    <p style={{ color: '#64748b', marginTop: '0.75rem' }}>Loading notifications...</p>
                </div>
            </div>
        )
    }

    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', padding: '2rem 1.25rem' }}>
            <div style={{ maxWidth: 720, margin: '0 auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>Notifications</h1>
                        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
                            {unreadCount > 0 ? unreadCount + ' unread notification' + (unreadCount !== 1 ? 's' : '') : 'All caught up'}
                        </p>
                    </div>
                    {unreadCount > 0 ? (
                        <button
                            onClick={handleMarkAllRead}
                            disabled={markingAll}
                            style={{ padding: '0.5rem 1.125rem', background: 'white', color: '#2563eb', border: '1.5px solid #2563eb', borderRadius: 8, fontSize: '0.875rem', fontWeight: 600, cursor: markingAll ? 'not-allowed' : 'pointer', opacity: markingAll ? 0.6 : 1, fontFamily: 'inherit' }}
                        >
                            {markingAll ? 'Marking...' : 'Mark all as read'}
                        </button>
                    ) : null}
                </div>

                {error ? (
                    <div style={{ padding: '0.875rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: '1.25rem' }}>
                        <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{error}</p>
                    </div>
                ) : null}

                {notifications.length === 0 ? (
                    <div style={{ background: 'white', borderRadius: 15, padding: '2rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                        <EmptyState
                            icon="🔔"
                            title="No notifications yet"
                            message="When someone sends you a request, approves a session, or rates you, it will appear here."
                        />
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                        {notifications.map(function(notification) {
                            const icon = NOTIFICATION_ICONS[notification.type] || '🔔'
                            return (
                                <div
                                    key={notification._id}
                                    onClick={function() { handleClick(notification) }}
                                    style={{
                                        background:    notification.read ? 'white' : '#eff6ff',
                                        borderRadius:  12,
                                        padding:       '1rem 1.25rem',
                                        boxShadow:     '0 2px 8px rgba(0,0,0,0.05)',
                                        border:        notification.read ? '1px solid #f1f5f9' : '1px solid #bfdbfe',
                                        display:       'flex',
                                        alignItems:    'flex-start',
                                        gap:           '0.875rem',
                                        cursor:        notification.link && notification.link !== '/' ? 'pointer' : 'default',
                                        transition:    'box-shadow 0.15s',
                                    }}
                                    onMouseEnter={function(e) {
                                        if (notification.link && notification.link !== '/') {
                                            e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'
                                        }
                                    }}
                                    onMouseLeave={function(e) {
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)'
                                    }}
                                >
                                    {/* Icon */}
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: notification.read ? '#f1f5f9' : '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.125rem', flexShrink: 0 }}>
                                        {icon}
                                    </div>
                                    {/* Content */}
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem' }}>
                                            <p style={{ fontWeight: notification.read ? 500 : 700, color: '#1e293b', fontSize: '0.9375rem', lineHeight: 1.4 }}>
                                                {notification.title}
                                            </p>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                                {!notification.read ? (
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563eb', display: 'inline-block', flexShrink: 0 }} />
                                                ) : null}
                                                <button
                                                    onClick={function(e) { handleDelete(e, notification._id) }}
                                                    style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.875rem', padding: '0 0.25rem', lineHeight: 1, fontFamily: 'inherit' }}
                                                    title="Remove"
                                                >
                                                    ✕
                                                </button>
                                            </div>
                                        </div>
                                        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 3, lineHeight: 1.5 }}>
                                            {notification.message}
                                        </p>
                                        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 6 }}>
                                            {timeAgo(notification.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

export default NotificationsPage
