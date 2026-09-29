import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import AuthCard from '../../components/ui/AuthCard'
import s from '../../components/ui/authStyles'
import useResendVerification from '../../hooks/useResendVerification'

/**
 * Shown right after registration: "check your inbox" + resend.
 * The email arrives via router state from RegisterPage; if the page is
 * opened directly the user can type it.
 */
const CheckEmailPage = function() {
    const location = useLocation()
    const [email, setEmail] = useState(location.state?.email || '')
    const emailSent = location.state?.emailSent !== false
    const { resend, status, message } = useResendVerification()

    return (
        <AuthCard icon="📬" title="Check your inbox">
            <p style={s.text}>
                {location.state?.email
                    ? <>We sent a verification link to <strong style={{ color: '#1e293b' }}>{location.state.email}</strong>. Click it to activate your account. The link expires in 24 hours.</>
                    : 'We sent you a verification link. Click it to activate your account. The link expires in 24 hours.'}
            </p>

            {!emailSent && status === 'idle' && (
                <div role="alert" style={s.error}>We couldn't send the email just now. Use the button below to try again.</div>
            )}
            {status === 'sent'  && <div role="status" style={s.success}>{message}</div>}
            {status === 'error' && <div role="alert" style={s.error}>{message}</div>}

            <form onSubmit={function(e) { e.preventDefault(); resend(email.trim()) }}>
                {!location.state?.email && (
                    <div style={{ marginBottom: '1rem' }}>
                        <label htmlFor="resend-email" style={s.label}>Email</label>
                        <input id="resend-email" type="email" required value={email} onChange={function(e) { setEmail(e.target.value) }} style={s.input} autoComplete="email" />
                    </div>
                )}
                <button type="submit" disabled={status === 'sending' || !email.trim()} style={{ ...s.button, opacity: status === 'sending' ? 0.7 : 1 }}>
                    {status === 'sending' ? 'Sending...' : "Didn't get it? Resend email"}
                </button>
            </form>

            <p style={{ ...s.text, margin: '1.25rem 0 0', fontSize: '0.875rem' }}>
                Check your spam folder too. Already verified? <Link to="/login" style={s.link}>Log in</Link>
            </p>
        </AuthCard>
    )
}

export default CheckEmailPage
