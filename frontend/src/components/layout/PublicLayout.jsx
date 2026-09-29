import { Link, NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectCurrentUser, selectIsAuthenticated } from '../../features/auth/authSlice'
import { homePathFor } from '../../utils/roles'
import Footer from './Footer'

/**
 * Shell for public pages (/about, /contact, /privacy, /terms): simple header,
 * content, shared Footer. Works signed in or out.
 */
const PublicLayout = function({ children }) {
    const isAuthenticated = useSelector(selectIsAuthenticated)
    const user            = useSelector(selectCurrentUser)

    return (
        <div className="public-root">
            <header className="public-header">
                <div className="public-header-inner">
                    <Link to="/" className="public-brand">SkillSwap</Link>
                    <nav className="public-nav" aria-label="Main">
                        <NavLink to="/about"   className={function({ isActive }) { return 'public-nav-link' + (isActive ? ' public-nav-link--active' : '') }}>About</NavLink>
                        <NavLink to="/contact" className={function({ isActive }) { return 'public-nav-link' + (isActive ? ' public-nav-link--active' : '') }}>Contact</NavLink>
                        {isAuthenticated ? (
                            <Link to={homePathFor(user)} className="public-cta">Open app</Link>
                        ) : (
                            <>
                                <Link to="/login" className="public-nav-link public-login">Log in</Link>
                                <Link to="/register" className="public-cta">Sign up</Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>
            <main className="public-main">{children}</main>
            <Footer />
        </div>
    )
}

export default PublicLayout
