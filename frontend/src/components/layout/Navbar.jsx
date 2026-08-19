import { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
    selectCurrentUser,
    selectIsAuthenticated,
    logoutUser,
} from '../../features/auth/authSlice'
import Spinner from '../ui/Spinner'
import api from '../../api/axios'
const NAV_LINKS = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/matches',   label: 'Matches'   },
    { path: '/requests',  label: 'Requests'  },
    { path: '/sessions',  label: 'Sessions'  },
    { path: '/messages',  label: 'Messages'  },
    { path: '/ratings',   label: 'Ratings'   },
]
const Navbar = function() {
    const dispatch        = useDispatch()
    const navigate        = useNavigate()
    const location        = useLocation()
    const user            = useSelector(selectCurrentUser)
    const isAuthenticated = useSelector(selectIsAuthenticated)
    const [mobileOpen,    setMobileOpen]    = useState(false)
    const [dropdownOpen,  setDropdownOpen]  = useState(false)
    const [loggingOut,    setLoggingOut]    = useState(false)
    const [isMobile,      setIsMobile]      = useState(false)
    const [avatarError,   setAvatarError]   = useState(false)
    const [unreadCount,   setUnreadCount]   = useState(0)
    const dropdownRef = useRef(null)
    useEffect(function() {
        const check = function() { setIsMobile(window.innerWidth < 768) }
        check()
        window.addEventListener('resize', check)
        return function() { window.removeEventListener('resize', check) }
    }, [])
    useEffect(function() {
        const handler = function(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setDropdownOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return function() { document.removeEventListener('mousedown', handler) }
    }, [])
    useEffect(function() { setMobileOpen(false) }, [location.pathname])
    useEffect(function() { setAvatarError(false) }, [user?.avatar])
    // Poll unread notification count every 60 seconds.
    // Only runs when authenticated — cleared when user logs out.
    useEffect(function() {
        if (!isAuthenticated) {
            setUnreadCount(0)
            return
        }
        const fetchCount = function() {
            api.get('/notifications/unread-count')
                .then(function(res) {
                    setUnreadCount(res.data.count || 0)
                })
                .catch(function() {
                    // Silently ignore — bell stays at previous count
                })
        }
        fetchCount()
        const interval = setInterval(fetchCount, 60000)
        return function() { clearInterval(interval) }
    }, [isAuthenticated])
    const handleLogout = async function() {
        setLoggingOut(true)
        await dispatch(logoutUser())
        navigate('/login', { replace: true })
    }
    const isActive = function(path) { return location.pathname === path }
    if (!isAuthenticated) return null
    const buildAvatarUrl = function(avatar) {
    if (!avatar) return null
    if (avatar.startsWith('http')) return avatar
    const path = avatar.startsWith('/') ? avatar : '/uploads/' + avatar
    return (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000') + path
}
    const avatarSrc = buildAvatarUrl(user?.avatar)
    const initial   = user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'
    return (
        <nav style={{ background: 'white', boxShadow: '0 2px 10px rgba(0,0,0,0.08)', position: 'fixed', top: 0, left: 0, zIndex: 1000, width: '100%' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
                {/* Logo */}
                <Link to="/dashboard" style={{ fontWeight: 700, fontSize: '1.5rem', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', textDecoration: 'none', letterSpacing: '-0.02em', flexShrink: 0 }}>
                    SkillSwap
                </Link>
                {/* Desktop nav */}
                {!isMobile ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {NAV_LINKS.map(function(link) {
                            const active = isActive(link.path)
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    style={{ padding: '0.4375rem 0.875rem', borderRadius: 8, fontSize: '0.9375rem', fontWeight: active ? 600 : 500, textDecoration: 'none', color: active ? '#2563eb' : '#1e293b', background: active ? '#eff6ff' : 'transparent', transition: 'all 0.2s' }}
                                >
                                    {link.label}
                                </Link>
                            )
                        })}
                    </div>
                ) : null}
                {/* Right side */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* Notification bell */}
                    <Link
                        to="/notifications"
                        style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 8, border: '1.5px solid #e2e8f0', background: isActive('/notifications') ? '#eff6ff' : 'white', color: isActive('/notifications') ? '#2563eb' : '#64748b', textDecoration: 'none', flexShrink: 0, transition: 'all 0.2s' }}
                        title="Notifications"
                    >
                        {/* Bell SVG */}
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        {/* Unread badge — only shown when count > 0 */}
                        {unreadCount > 0 ? (
                            <span style={{
                                position: 'absolute',
                                top: -4,
                                right: -4,
                                minWidth: 18,
                                height: 18,
                                background: '#ef4444',
                                color: 'white',
                                borderRadius: 9,
                                fontSize: '0.6875rem',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 4px',
                                lineHeight: 1,
                                border: '2px solid white'
                            }}>
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </span>
                        ) : null}
                    </Link>
                    {/* User dropdown */}
                    <div style={{ position: 'relative' }} ref={dropdownRef}>
                        <button
                            onClick={function() { setDropdownOpen(!dropdownOpen) }}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0.375rem 0.75rem 0.375rem 0.375rem', borderRadius: 50, border: '1.5px solid #e2e8f0', background: dropdownOpen ? '#f8fafc' : 'white', cursor: 'pointer', transition: 'all 0.2s' }}
                        >
                            {/* Avatar with React state fallback */}
                            <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', flexShrink: 0 }}>
                                {avatarSrc && !avatarError ? (
                                    <img
                                        src={avatarSrc}
                                        alt={user?.fullName}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                        onError={function() { setAvatarError(true) }}
                                    />
                                ) : (
                                    <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '0.875rem' }}>
                                        {initial}
                                    </div>
                                )}
                            </div>
                            {!isMobile ? (
                                <div className="navbar-avatar-text" style={{ textAlign: 'left', maxWidth: 130 }}>
                                    <p style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1e293b', lineHeight: 1.3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {user?.fullName}
                                    </p>
                                    <p style={{ fontSize: '0.6875rem', color: '#64748b', lineHeight: 1.3 }}>
                                        {(user?.reputation?.toFixed(1) || '0.0') + ' reputation'}
                                    </p>
                                </div>
                            ) : null}
                            {!isMobile ? (
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="navbar-avatar-caret" style={{ color: '#9ca3af', flexShrink: 0, transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>
                                    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                            ) : null}
                        </button>
                        {/* Dropdown */}
                        {dropdownOpen ? (
                            <div style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: '14rem', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 12, boxShadow: '0 10px 30px rgba(0,0,0,0.12)', overflow: 'hidden', zIndex: 50 }}>
                                <div style={{ padding: '0.875rem 1rem', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                                    <p style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.fullName}</p>
                                    <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
                                </div>
                                <div style={{ padding: '0.375rem' }}>
                                    {[
                                        { to: '/profile',      label: 'My Profile'   },
                                        { to: '/profile/edit', label: 'Edit Profile' },
                                        { to: '/sessions',     label: 'My Sessions'  },
                                        { to: '/ratings',      label: 'Ratings'      },
                                    ].map(function(item) {
                                        return (
                                            <Link
                                                key={item.to}
                                                to={item.to}
                                                onClick={function() { setDropdownOpen(false) }}
                                                style={{ display: 'block', padding: '0.5625rem 0.875rem', borderRadius: 8, fontSize: '0.9rem', color: '#374151', textDecoration: 'none', transition: 'all 0.1s' }}
                                                onMouseEnter={function(e) { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#2563eb' }}
                                                onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#374151' }}
                                            >
                                                {item.label}
                                            </Link>
                                        )
                                    })}
                                </div>
                                <div style={{ padding: '0.375rem', borderTop: '1px solid #f1f5f9' }}>
                                    <button
                                        onClick={handleLogout}
                                        disabled={loggingOut}
                                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '0.5625rem 0.875rem', borderRadius: 8, fontSize: '0.9rem', color: '#ef4444', background: 'transparent', border: 'none', cursor: loggingOut ? 'not-allowed' : 'pointer', opacity: loggingOut ? 0.6 : 1, transition: 'all 0.1s', textAlign: 'left', fontFamily: 'inherit' }}
                                        onMouseEnter={function(e) { e.currentTarget.style.background = '#fef2f2' }}
                                        onMouseLeave={function(e) { e.currentTarget.style.background = 'transparent' }}
                                    >
                                        {loggingOut ? <><Spinner size="sm" /> Logging out...</> : 'Log out'}
                                    </button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                    {/* Hamburger — only on mobile */}
                    {isMobile ? (
                        <button
                            onClick={function() { setMobileOpen(!mobileOpen) }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#1e293b', fontSize: '1rem' }}
                        >
                            {mobileOpen ? '✕' : '≡'}
                        </button>
                    ) : null}
                </div>
            </div>
            {/* Mobile menu */}
            {isMobile && mobileOpen ? (
                <div className="navbar-mobile-drawer" style={{ position: 'absolute', top: '100%', left: 0, right: 0, borderTop: '1px solid #f1f5f9', background: 'white', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
                    <div style={{ padding: '0.75rem 1.25rem' }}>
                        {NAV_LINKS.map(function(link) {
                            const active = isActive(link.path)
                            return (
                                <Link
                                    key={link.path}
                                    to={link.path}
                                    style={{ display: 'block', padding: '0.625rem 0.75rem', borderRadius: 8, fontSize: '0.9375rem', fontWeight: active ? 600 : 500, textDecoration: 'none', color: active ? '#2563eb' : '#1e293b', background: active ? '#eff6ff' : 'transparent', marginBottom: 2 }}
                                >
                                    {link.label}
                                </Link>
                            )
                        })}
                        <div style={{ height: 1, background: '#f1f5f9', margin: '0.5rem 0' }} />
                        <Link
                            to="/notifications"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 0.75rem', borderRadius: 8, fontSize: '0.9375rem', textDecoration: 'none', color: '#1e293b', marginBottom: 2 }}
                        >
                            <span>Notifications</span>
                            {unreadCount > 0 ? (
                                <span style={{ background: '#ef4444', color: 'white', borderRadius: 9, fontSize: '0.6875rem', fontWeight: 700, padding: '0.125rem 0.375rem', minWidth: 18, textAlign: 'center' }}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                            ) : null}
                        </Link>
                        <Link to="/profile" style={{ display: 'block', padding: '0.625rem 0.75rem', borderRadius: 8, fontSize: '0.9375rem', textDecoration: 'none', color: '#1e293b' }}>
                            My Profile
                        </Link>
                        <button
                            onClick={handleLogout}
                            disabled={loggingOut}
                            style={{ display: 'block', width: '100%', padding: '0.625rem 0.75rem', borderRadius: 8, fontSize: '0.9375rem', color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
                        >
                            {loggingOut ? 'Logging out...' : 'Log out'}
                        </button>
                    </div>
                </div>
            ) : null}
        </nav>
    )
}
export default Navbar