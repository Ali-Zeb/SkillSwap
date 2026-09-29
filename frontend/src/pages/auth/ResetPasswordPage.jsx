import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import api from '../../api/axios'
import AuthCard from '../../components/ui/AuthCard'
import s from '../../components/ui/authStyles'

const PASSWORD_MIN = 8

const ResetPasswordPage = function() {
    const { token } = useParams()
    const [password, setPassword] = useState('')
    const [confirm,  setConfirm]  = useState('')
    const [status,   setStatus]   = useState('idle')   // idle | saving | done | invalid | error
    const [message,  setMessage]  = useState(null)

    const submit = async function(e) {
        e.preventDefault()
        if (password.length < PASSWORD_MIN) { setStatus('error'); setMessage('Password must be at least ' + PASSWORD_MIN + ' characters'); return }
        if (password !== confirm)          { setStatus('error'); setMessage('Passwords do not match'); return }
        setStatus('saving')
        setMessage(null)
        try {
            const { data } = await api.post('/auth/reset-password/' + token, { password })
            setStatus('done')
            setMessage(data.message)
        } catch (err) {
            const data = err.response?.data
            setStatus(data?.code === 'TOKEN_INVALID' ? 'invalid' : 'error')
            setMessage(data?.message || 'Could not reset your password. Please try again.')
        }
    }

    if (status === 'done') {
        return (
            <AuthCard icon="✅" title="Password updated">
                <p style={s.text}>{message} You have been signed out on all other devices.</p>
                <Link to="/login" style={{ ...s.button, display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>Log in</Link>
            </AuthCard>
        )
    }

    if (status === 'invalid') {
        return (
            <AuthCard icon="⚠️" title="Link invalid or expired">
                <p style={s.text}>{message}</p>
                <Link to="/forgot-password" style={{ ...s.button, display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>Request a new link</Link>
            </AuthCard>
        )
    }

    return (
        <AuthCard icon="🔒" title="Choose a new password">
            <p style={s.text}>Use at least {PASSWORD_MIN} characters.</p>
            {status === 'error' && <div role="alert" style={s.error}>{message}</div>}
            <form onSubmit={submit} noValidate>
                <label htmlFor="new-password" style={s.label}>New password</label>
                <input id="new-password" type="password" value={password} autoComplete="new-password" autoFocus
                    onChange={function(e) { setPassword(e.target.value) }} style={{ ...s.input, marginBottom: '1rem' }} />
                <label htmlFor="confirm-password" style={s.label}>Confirm new password</label>
                <input id="confirm-password" type="password" value={confirm} autoComplete="new-password"
                    onChange={function(e) { setConfirm(e.target.value) }} style={{ ...s.input, marginBottom: '1.25rem' }} />
                <button type="submit" disabled={status === 'saving'} style={{ ...s.button, opacity: status === 'saving' ? 0.7 : 1 }}>
                    {status === 'saving' ? 'Saving...' : 'Reset password'}
                </button>
            </form>
        </AuthCard>
    )
}

export default ResetPasswordPage
