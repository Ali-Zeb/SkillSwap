import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, Flag, CalendarDays, ScrollText, Settings, X, LifeBuoy } from 'lucide-react'
import api from '../../api/axios'
import AdminTopBar from './AdminTopBar'

const ADMIN_LINKS = [
    { to: '/admin',            label: 'Dashboard',    Icon: LayoutDashboard, end: true },
    { to: '/admin/users',      label: 'Users',        Icon: Users },
    { to: '/admin/reports',    label: 'User Reports', Icon: Flag },
    { to: '/admin/support',    label: 'Support',      Icon: LifeBuoy, badgeKey: 'support' },
    { to: '/admin/sessions',   label: 'Sessions',     Icon: CalendarDays },
    { to: '/admin/audit-logs', label: 'Audit Log',    Icon: ScrollText },
]

const SETTINGS_LINK = { to: '/admin/settings', label: 'Settings', Icon: Settings }

const SideLink = function({ link, onNavigate, badge }) {
    const { to, label, Icon, end } = link
    return (
        <NavLink to={to} end={end} onClick={onNavigate}
            className={function({ isActive }) { return 'admin-nav-link' + (isActive ? ' admin-nav-link--active' : '') }}>
            <Icon size={18} strokeWidth={2} aria-hidden="true" />
            <span>{label}</span>
            {badge > 0 && <span className="admin-nav-badge" aria-label={badge + ' waiting'}>{badge > 99 ? '99+' : badge}</span>}
        </NavLink>
    )
}

// Tickets waiting for an admin reply — refreshed every 60 s.
const useSupportBadge = function() {
    const [count, setCount] = useState(0)
    useEffect(function() {
        let cancelled = false
        const load = function() {
            api.get('/admin/support/count')
                .then(function({ data }) { if (!cancelled) setCount(data.count || 0) })
                .catch(function() {})
        }
        load()
        const id = setInterval(load, 60000)
        return function() { cancelled = true; clearInterval(id) }
    }, [])
    return count
}

/**
 * Admin-only shell: a dark sidebar (off-canvas drawer below 1024px), an
 * admin top bar, and the page header. No member Navbar.
 */
const AdminLayout = function({ title, subtitle, actions, children }) {
    const [drawerOpen, setDrawerOpen] = useState(false)
    const location = useLocation()
    const supportBadge = useSupportBadge()
    const close = function() { setDrawerOpen(false) }

    // Escape closes the mobile drawer; the page behind it doesn't scroll.
    useEffect(function() {
        if (!drawerOpen) return
        const onKey = function(e) { if (e.key === 'Escape') setDrawerOpen(false) }
        document.addEventListener('keydown', onKey)
        document.body.style.overflow = 'hidden'
        return function() {
            document.removeEventListener('keydown', onKey)
            document.body.style.overflow = ''
        }
    }, [drawerOpen])

    return (
        <div className="admin-root">
            <aside id="admin-sidebar" className={'admin-sidebar' + (drawerOpen ? ' admin-sidebar--open' : '')} aria-label="Admin navigation">
                <div className="admin-sidebar-brand">
                    <Link to="/admin" onClick={close} className="admin-brand">
                        <span className="admin-brand-mark" aria-hidden="true">S</span>
                        <span className="admin-brand-text">SkillSwap</span>
                        <span className="admin-brand-tag">Admin</span>
                    </Link>
                    <button type="button" className="admin-drawer-close" onClick={close} aria-label="Close menu">
                        <X size={20} aria-hidden="true" />
                    </button>
                </div>

                <nav className="admin-nav">
                    <p className="admin-nav-section">Overview</p>
                    {ADMIN_LINKS.map(function(link) {
                        return <SideLink key={link.to} link={link} onNavigate={close} badge={link.badgeKey === 'support' ? supportBadge : 0} />
                    })}
                    <p className="admin-nav-section">Account</p>
                    <SideLink link={SETTINGS_LINK} onNavigate={close} />
                </nav>

                <p className="admin-sidebar-foot">SkillSwap Admin · {new Date().getFullYear()}</p>
            </aside>

            {drawerOpen && <div className="admin-backdrop" onClick={close} aria-hidden="true" />}

            <div className="admin-body">
                <AdminTopBar onMenuClick={function() { setDrawerOpen(true) }} menuOpen={drawerOpen} pathname={location.pathname} />
                <main className="admin-main">
                    <div className="admin-page-head">
                        <div style={{ minWidth: 0 }}>
                            <h1 className="admin-page-title">{title}</h1>
                            {subtitle && <p className="admin-page-subtitle">{subtitle}</p>}
                        </div>
                        {actions}
                    </div>
                    {children}
                </main>
            </div>
        </div>
    )
}

export default AdminLayout
