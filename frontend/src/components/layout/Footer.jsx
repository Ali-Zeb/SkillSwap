import { Link } from 'react-router-dom'
import { site } from '../../content/siteContent'

const COLUMNS = [
    { heading: 'Explore', links: [
        { label: 'About SkillSwap', to: '/about' },
        { label: 'How it works',    to: '/about#how-it-works' },
        { label: 'Contact',         to: '/contact' },
    ] },
    { heading: 'Members', links: [
        { label: 'Log in',          to: '/login' },
        { label: 'Create account',  to: '/register' },
        { label: 'Help & Support',  to: '/support' },
    ] },
    { heading: 'Legal', links: [
        { label: 'Privacy Policy',   to: '/privacy' },
        { label: 'Terms of Service', to: '/terms' },
    ] },
]

/**
 * Shared site footer for the landing page, public pages and member pages
 * (never shown inside /admin).
 */
const Footer = function() {
    return (
        <footer className="site-footer">
            <div className="site-footer-inner">
                <div className="site-footer-grid">
                    <div>
                        <Link to="/" className="site-footer-brand">{site.name}</Link>
                        <p className="site-footer-text">{site.tagline}</p>
                        <p className="site-footer-text" style={{ marginTop: '0.75rem' }}>
                            <a href={'mailto:' + site.supportEmail} className="site-footer-link">{site.supportEmail}</a><br />
                            {site.location}
                        </p>
                    </div>
                    {COLUMNS.map(function(col) {
                        return (
                            <nav key={col.heading} aria-label={col.heading}>
                                <h4 className="site-footer-heading">{col.heading}</h4>
                                <ul className="site-footer-list">
                                    {col.links.map(function(l) {
                                        return <li key={l.to}><Link to={l.to} className="site-footer-link">{l.label}</Link></li>
                                    })}
                                </ul>
                            </nav>
                        )
                    })}
                </div>
                <div className="site-footer-bottom">
                    © {new Date().getFullYear()} {site.name}. All rights reserved. Built as a Final Year Project.
                </div>
            </div>
        </footer>
    )
}

export default Footer
