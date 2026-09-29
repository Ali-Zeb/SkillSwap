import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import api from '../../api/axios'
import { logoutUser, selectCurrentUser } from '../../features/auth/authSlice'
import { Bell, ChevronDown, LogOut, Menu, UserCog } from 'lucide-react'
import { getAvatarUrl, timeAgo } from '../../utils/helpers'

// Closes a dropdown when the user clicks outside it or presses Escape.
const useDismiss = function(open, setOpen) {
    const ref = useRef(null)
    useEffect(function() {
        if (!open) return
        const onDown = function(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        const onKey  = function(e) { if (e.key === 'Escape') setOpen(false) }
        document.addEventListener('mousedown', onDown)
        document.addEventListener('keydown', onKey)
        return function() {
            document.removeEventListener('mousedown', onDown)
            document.removeEventListener('keydown', onKey)
        }
    }, [open, setOpen])
    return ref
}

const iconButton = { position: 'relative', width: 38, height: 38, borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#475569', fontSize: '1.0625rem', flexShrink: 0 }
const dropdown   = { position: 'absolute', right: 0, top: 'calc(100% + 8px)', background: 'white', borderRadius: 12, boxShadow: '0 12px 32px rgba(15,23,42,0.16)', border: '1px solid #f1f5f9', zIndex: 60 }

const NotificationBell = function() {
    const navigate = useNavigate()
    const [open,    setOpen]    = useState(false)
    const [unread,  setUnread]  = useState(0)
    const [items,   setItems]   = useState(null)
    const [error,   setError]   = useState(null)
    const ref = useDismiss(open, setOpen)

    // Unread badge: on load and every 60 s (same cadence as the member navbar).
    useEffect(function() {
        let cancelled = false
        const fetchCount = function() {
            api.get('/notifications/unread-count')
                .then(function({ data }) { if (!cancelled) setUnread(data.count || 0) })
                .catch(function() {})
        }
        fetchCount()
        const id = setInterval(fetchCount, 60000)
        return function() { cancelled = true; clearInterval(id) }
    }, [])

    const toggle = function() {
        const next = !open
        setOpen(next)
        if (next) {
            setError(null)
            api.get('/notifications', { params: { limit: 10 } })
                .then(function({ data }) { setItems(data.notifications || []); setUnread(data.unreadCount ?? 0) })
                .catch(function() { setError('Could not load notifications') })
        }
    }

    const openItem = function(n) {
        if (!n.read) {
            api.put('/notifications/' + n._id + '/read').catch(function() {})
            setItems(function(list) { return list.map(function(x) { return x._id === n._id ? { ...x, read: true } : x }) })
            setUnread(function(c) { return Math.max(0, c - 1) })
        }
        setOpen(false)
        // Only admin destinations — member pages are not available to admins.
        if (n.link && n.link.startsWith('/admin')) navigate(n.link)
    }

    const markAll = function() {
        api.put('/notifications/read-all')
            .then(function() {
                setUnread(0)
                setItems(function(list) { return (list || []).map(function(x) { return { ...x, read: true } }) })
            })
            .catch(function() {})
    }

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button type="button" onClick={toggle} style={iconButton} aria-label={'Notifications' + (unread ? ', ' + unread + ' unread' : '')} aria-expanded={open}>
                <Bell size={18} aria-hidden="true" />
                {unread > 0 && (
                    <span style={{ position: 'absolute', top: -6, right: -6, minWidth: 18, height: 18, padding: '0 5px', borderRadius: 9, background: '#dc2626', color: 'white', fontSize: '0.6875rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box' }}>
                        {unread > 99 ? '99+' : unread}
                    </span>
                )}
            </button>
            {open && (
                <div role="dialog" aria-label="Notifications" style={{ ...dropdown, width: 'min(340px, calc(100vw - 32px))' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9' }}>
                        <strong style={{ fontSize: '0.9375rem', color: '#1e293b' }}>Notifications</strong>
                        {unread > 0 && <button type="button" onClick={markAll} style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer' }}>Mark all read</button>}
                    </div>
                    <div style={{ maxHeight: 360, overflowY: 'auto' }}>
                        {error && <p style={{ padding: '1rem', color: '#b91c1c', fontSize: '0.875rem', margin: 0 }}>{error}</p>}
                        {!error && items === null && <p style={{ padding: '1rem', color: '#64748b', fontSize: '0.875rem', margin: 0 }}>Loading...</p>}
                        {!error && items && items.length === 0 && <p style={{ padding: '1.25rem 1rem', color: '#64748b', fontSize: '0.875rem', margin: 0, textAlign: 'center' }}>No notifications yet.</p>}
                        {!error && items && items.map(function(n) {
                            return (
                                <button key={n._id} type="button" onClick={function() { openItem(n) }}
                                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '0.75rem 1rem', border: 'none', borderBottom: '1px solid #f8fafc', background: n.read ? 'white' : '#eff6ff', cursor: 'pointer', fontFamily: 'inherit' }}>
                                    <span style={{ display: 'block', fontWeight: 600, fontSize: '0.875rem', color: '#1e293b' }}>{n.title}</span>
                                    <span style={{ display: 'block', fontSize: '0.8125rem', color: '#475569', marginTop: 2 }}>{n.message}</span>
                                    <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>{timeAgo(n.createdAt)}</span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}

const AccountMenu = function() {
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const user     = useSelector(selectCurrentUser)
    const [open, setOpen] = useState(false)
    const ref = useDismiss(open, setOpen)

    const logout = async function() {
        setOpen(false)
        await dispatch(logoutUser())
        navigate('/login', { replace: true })
    }

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button type="button" onClick={function() { setOpen(function(o) { return !o }) }} aria-expanded={open} aria-haspopup="menu"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.5rem 0.25rem 0.25rem', borderRadius: 999, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', maxWidth: 220 }}>
                <img src={getAvatarUrl(user?.avatar, user?.fullName)} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                <span className="admin-topbar-name" style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.fullName}</span>
                <ChevronDown size={16} color="#94a3b8" aria-hidden="true" />
            </button>
            {open && (
                <div role="menu" style={{ ...dropdown, width: 220, padding: '0.375rem' }}>
                    <div style={{ padding: '0.5rem 0.625rem 0.625rem', borderBottom: '1px solid #f1f5f9', marginBottom: '0.25rem' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.fullName}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</div>
                    </div>
                    <Link role="menuitem" to="/admin/settings" onClick={function() { setOpen(false) }}
                        className="admin-menu-item">
                        <UserCog size={16} aria-hidden="true" /> Account settings
                    </Link>
                    <button role="menuitem" type="button" onClick={logout}
                        className="admin-menu-item admin-menu-item--danger">
                        <LogOut size={16} aria-hidden="true" /> Log out
                    </button>
                </div>
            )}
        </div>
    )
}

const SECTION_NAMES = [
    ['/admin/users', 'Users'], ['/admin/reports', 'User Reports'], ['/admin/support', 'Support'], ['/admin/sessions', 'Sessions'],
    ['/admin/audit-logs', 'Audit Log'], ['/admin/settings', 'Settings'], ['/admin', 'Dashboard'],
]

/**
 * Admin-only top bar: menu button (mobile), current section, notifications
 * and account menu. Replaces the member Navbar inside /admin; the brand
 * lives in the sidebar.
 */
const AdminTopBar = function({ onMenuClick, menuOpen, pathname }) {
    const section = (SECTION_NAMES.find(function([p]) { return pathname.startsWith(p) }) || [])[1] || 'Admin'
    return (
        <header className="admin-topbar">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                <button type="button" className="admin-hamburger" onClick={onMenuClick} aria-label="Open menu" aria-controls="admin-sidebar" aria-expanded={menuOpen}>
                    <Menu size={20} aria-hidden="true" />
                </button>
                <div className="admin-topbar-crumb">
                    <span className="admin-topbar-crumb-root">Admin</span>
                    <span aria-hidden="true" style={{ color: '#cbd5e1' }}>/</span>
                    <span className="admin-topbar-crumb-current">{section}</span>
                </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <NotificationBell />
                <AccountMenu />
            </div>
        </header>
    )
}

export default AdminTopBar
