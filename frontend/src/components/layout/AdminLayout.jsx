import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import AdminTopBar from './AdminTopBar'

const ADMIN_LINKS = [
    { to: '/admin',            label: 'Dashboard', icon: '📊', end: true },
    { to: '/admin/users',      label: 'Users',     icon: '👥' },
    { to: '/admin/reports',    label: 'User Reports', icon: '🚩' },
    { to: '/admin/sessions',   label: 'Sessions',  icon: '📅' },
    { to: '/admin/audit-logs', label: 'Audit Log', icon: '📜' },
    { to: '/admin/settings',   label: 'Settings',  icon: '⚙️' },
]

/**
 * Admin-only shell: its own top bar (no member Navbar) and a sidebar that
 * collapses into a menu button on mobile.
 */
const AdminLayout = function({ title, subtitle, actions, children }) {
    const [menuOpen, setMenuOpen] = useState(false)
    const location = useLocation()
    const current  = ADMIN_LINKS.find(function(l) { return l.end ? location.pathname === l.to : location.pathname.startsWith(l.to) })

    return (
        <div className="admin-root">
        <AdminTopBar />
        <div className="admin-shell">
            <aside className="admin-sidebar" aria-label="Admin navigation">
                <div className="admin-sidebar-head">
                    <span className="admin-sidebar-title">Admin Panel</span>
                    <button
                        type="button"
                        className="admin-menu-toggle"
                        aria-expanded={menuOpen}
                        aria-controls="admin-nav"
                        onClick={function() { setMenuOpen(function(o) { return !o }) }}
                    >
                        {(current ? current.icon + ' ' + current.label : 'Menu') + (menuOpen ? ' ▲' : ' ▼')}
                    </button>
                </div>
                <nav id="admin-nav" className={'admin-nav' + (menuOpen ? ' admin-nav--open' : '')}>
                    {ADMIN_LINKS.map(function(link) {
                        return (
                            <NavLink
                                key={link.to}
                                to={link.to}
                                end={link.end}
                                onClick={function() { setMenuOpen(false) }}
                                className={function({ isActive }) { return 'admin-nav-link' + (isActive ? ' admin-nav-link--active' : '') }}
                            >
                                <span aria-hidden="true">{link.icon}</span>
                                <span>{link.label}</span>
                            </NavLink>
                        )
                    })}
                </nav>
            </aside>

            <main className="admin-main">
                <div className="admin-page-head">
                    <div style={{ minWidth: 0 }}>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>{title}</h1>
                        {subtitle && <p style={{ color: '#64748b', margin: '0.25rem 0 0', fontSize: '0.9375rem' }}>{subtitle}</p>}
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
