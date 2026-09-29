import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../api/axios'
import AuthCard from '../../components/ui/AuthCard'
import s from '../../components/ui/authStyles'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ForgotPasswordPage = function() {
    const [email,   setEmail]   = useState('')
    const [status,  setStatus]  = useState('idle')   // idle | sending | sent | error
    const [message, setMessage] = useState(null)

    const submit = async function(e) {
        e.preventDefault()
        const value = email.trim()
        if (!EMAIL_REGEX.test(value)) { setStatus('error'); setMessage('Please enter a valid email address'); return }
        setStatus('sending')
        setMessage(null)
        try {
            const { data } = await api.post('/auth/forgot-password', { email: value })
            setStatus('sent')
            setMessage(data.message)
        } catch (err) {
            setStatus('error')
            setMessage(err.response?.data?.message || 'Something went wrong. Please try again.')
        }
    }

    if (status === 'sent') {
        return (
            <AuthCard icon="📬" title="Check your inbox">
                <p style={s.text}>{message}</p>
                <Link to="/login" style={{ ...s.button, display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>Back to login</Link>
            </AuthCard>
        )
    }

    return (
        <AuthCard icon="🔑" title="Forgot your password?">
            <p style={s.text}>Enter your account email and we'll send you a link to choose a new password.</p>
            {status === 'error' && <div role="alert" style={s.error}>{message}</div>}
            <form onSubmit={submit} noValidate>
                <label htmlFor="forgot-email" style={s.label}>Email</label>
                <input id="forgot-email" type="email" value={email} autoComplete="email" autoFocus
                    onChange={function(e) { setEmail(e.target.value) }} style={{ ...s.input, marginBottom: '1rem' }} />
                <button type="submit" disabled={status === 'sending'} style={{ ...s.button, opacity: status === 'sending' ? 0.7 : 1 }}>
                    {status === 'sending' ? 'Sending...' : 'Send reset link'}
                </button>
            </form>
            <p style={{ ...s.text, margin: '1.25rem 0 0', fontSize: '0.875rem' }}>
                Remembered it? <Link to="/login" style={s.link}>Log in</Link>
            </p>
        </AuthCard>
    )
}

export default ForgotPasswordPage
