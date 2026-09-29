import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import api from '../../api/axios'
import { setCredentials } from '../../features/auth/authSlice'
import AuthCard from '../../components/ui/AuthCard'
import s from '../../components/ui/authStyles'
import Spinner from '../../components/ui/Spinner'
import useResendVerification from '../../hooks/useResendVerification'

/**
 * Opened from the emailed link /verify-email/:token. Verifies the token,
 * signs the user in, and offers a resend form when the link is invalid
 * or expired.
 */
const VerifyEmailPage = function() {
    const { token }  = useParams()
    const dispatch   = useDispatch()
    const navigate   = useNavigate()
    const [state,    setState]   = useState({ status: 'verifying', message: null })
    const [email,    setEmail]   = useState('')
    const requested  = useRef(false)
    const { resend, status: resendStatus, message: resendMessage } = useResendVerification()

    useEffect(function() {
        // StrictMode runs effects twice in dev; the token is single-use.
        if (requested.current) return
        requested.current = true
        api.post('/auth/verify-email', { token })
            .then(function({ data }) {
                if (data.token) dispatch(setCredentials({ user: data.user, token: data.token }))
                setState({ status: 'success', message: data.message, signedIn: !!data.token })
            })
            .catch(function(err) {
                setState({ status: 'error', message: err.response?.data?.message || 'Verification failed. Please try again.' })
            })
    }, [token, dispatch])

    if (state.status === 'verifying') {
        return (
            <AuthCard title="Verifying your email...">
                <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem 0' }}><Spinner size="lg" /></div>
            </AuthCard>
        )
    }

    if (state.status === 'success') {
        return (
            <AuthCard icon="✅" title="Email verified">
                <p style={s.text}>{state.message}</p>
                {state.signedIn ? (
                    <button type="button" onClick={function() { navigate('/dashboard', { replace: true }) }} style={s.button}>Go to dashboard</button>
                ) : (
                    <Link to="/login" style={{ ...s.button, display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>Log in</Link>
                )}
            </AuthCard>
        )
    }

    return (
        <AuthCard icon="⚠️" title="Link invalid or expired">
            <p style={s.text}>{state.message}</p>
            {resendStatus === 'sent'  && <div role="status" style={s.success}>{resendMessage}</div>}
            {resendStatus === 'error' && <div role="alert" style={s.error}>{resendMessage}</div>}
            <form onSubmit={function(e) { e.preventDefault(); resend(email.trim()) }}>
                <label htmlFor="verify-email" style={s.label}>Your email</label>
                <input id="verify-email" type="email" required value={email} autoComplete="email"
                    onChange={function(e) { setEmail(e.target.value) }} style={{ ...s.input, marginBottom: '1rem' }} />
                <button type="submit" disabled={resendStatus === 'sending' || !email.trim()} style={{ ...s.button, opacity: resendStatus === 'sending' ? 0.7 : 1 }}>
                    {resendStatus === 'sending' ? 'Sending...' : 'Send a new link'}
                </button>
            </form>
            <p style={{ ...s.text, margin: '1.25rem 0 0', fontSize: '0.875rem' }}>
                Already verified? <Link to="/login" style={s.link}>Log in</Link>
            </p>
        </AuthCard>
    )
}

export default VerifyEmailPage
