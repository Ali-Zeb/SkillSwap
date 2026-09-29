import { Link } from 'react-router-dom'

/**
 * Centered card used by the email-verification and password-reset pages.
 */
const AuthCard = function({ icon, title, children }) {
    return (
        <div style={{ minHeight: '100vh', background: 'var(--background)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 16px', boxSizing: 'border-box' }}>
            <div style={{ width: '100%', maxWidth: 440 }}>
                <Link to="/" style={{ display: 'block', textAlign: 'center', marginBottom: '1.25rem', fontSize: '1.5rem', fontWeight: 800, textDecoration: 'none', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                    SkillSwap
                </Link>
                <div style={{ background: 'white', borderRadius: 16, boxShadow: '0 10px 30px rgba(15,23,42,0.08)', padding: '2rem 1.75rem', boxSizing: 'border-box' }}>
                    {icon && <div aria-hidden="true" style={{ fontSize: '2.5rem', textAlign: 'center', marginBottom: '0.5rem' }}>{icon}</div>}
                    <h1 style={{ fontSize: '1.375rem', fontWeight: 700, color: '#1e293b', textAlign: 'center', margin: '0 0 0.75rem' }}>{title}</h1>
                    {children}
                </div>
            </div>
        </div>
    )
}

export default AuthCard
