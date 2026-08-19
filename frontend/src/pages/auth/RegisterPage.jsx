import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
    registerUser,
    clearError,
    selectAuthLoading,
    selectAuthError,
    selectIsAuthenticated,
} from '../../features/auth/authSlice'
import Spinner from '../../components/ui/Spinner'

const FEATURES = [
    'Create your skill profile',
    'Get AI-powered matches',
    'Schedule learning sessions',
    'Build your reputation',
]

const RegisterPage = function() {
    const dispatch        = useDispatch()
    const navigate        = useNavigate()
    const isLoading       = useSelector(selectAuthLoading)
    const error           = useSelector(selectAuthError)
    const isAuthenticated = useSelector(selectIsAuthenticated)

    const [fullName,        setFullName]        = useState('')
    const [email,           setEmail]           = useState('')
    const [password,        setPassword]        = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [errors,          setErrors]          = useState({})

    useEffect(function() {
        if (isAuthenticated) navigate('/dashboard', { replace: true })
    }, [isAuthenticated, navigate])

    useEffect(function() {
        dispatch(clearError())
    }, [dispatch])

    const validate = function() {
        const errs = {}
        if (!fullName.trim())                errs.fullName        = 'Full name is required'
        else if (fullName.trim().length < 2) errs.fullName        = 'At least 2 characters'
        if (!email.trim())                   errs.email           = 'Email is required'
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Please enter a valid email'
        if (!password)                       errs.password        = 'Password is required'
        else if (password.length < 8)        errs.password        = 'At least 8 characters required'
        if (!confirmPassword)                errs.confirmPassword = 'Please confirm your password'
        else if (confirmPassword !== password) errs.confirmPassword = 'Passwords do not match'
        return errs
    }

    const handleSubmit = async function(e) {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length > 0) {
            setErrors(errs)
            return
        }
        setErrors({})
        const result = await dispatch(registerUser({ fullName, email, password }))
        if (registerUser.fulfilled.match(result)) {
            navigate('/dashboard', { replace: true })
        }
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* Navbar — fixed so it stays visible if the form ever grows
                taller than the viewport (see LandingPage.jsx for why fixed
                rather than sticky: overflow-x:hidden on html/body breaks
                sticky, fixed is immune to it) */}
            <nav style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 40, background: 'white', borderBottom: '1px solid #e5e7eb', padding: '0 1.5rem', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <Link to="/" style={{ fontWeight: 700, fontSize: '1.375rem', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', textDecoration: 'none' }}>
                    SkillSwap
                </Link>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Link to="/" style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#4b5563', textDecoration: 'none' }}>
                        Home
                    </Link>
                    <Link to="/login" style={{ padding: '0.4375rem 1.125rem', fontSize: '0.875rem', fontWeight: 500, color: '#2563eb', border: '1.5px solid #2563eb', borderRadius: 8, textDecoration: 'none' }}>
                        Login
                    </Link>
                    <Link to="/register" style={{ padding: '0.4375rem 1.125rem', fontSize: '0.875rem', fontWeight: 600, color: 'white', background: '#2563eb', borderRadius: 8, textDecoration: 'none' }}>
                        Sign Up
                    </Link>
                </div>
            </nav>

            {/* Card — top padding includes an extra 64px to reserve the
                space the now-fixed navbar above no longer occupies in flow */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'calc(2rem + 64px) 1rem 2rem' }}>
                <div style={{ width: '100%', maxWidth: 900, background: 'white', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', minHeight: 580 }}>

                    {/* ── Left gradient panel — hidden on mobile via .auth-left-panel class ── */}
                    <div style={{
                        flex: '0 0 44%',
                        background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #7c3aed 100%)',
                        padding: '3rem 2.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                    }} className="auth-left-panel">
                        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
                        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem', lineHeight: 1.2 }}>
                                Join SkillSwap Today!
                            </h2>
                            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9375rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                                Start your skill exchange journey and connect with amazing peers worldwide.
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                {FEATURES.map(function(feature) {
                                    return (
                                        <div key={feature} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                    <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </div>
                                            <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9375rem' }}>{feature}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>

                    {/* ── Right form panel ── */}
                    <div style={{ flex: 1, padding: '2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center', overflowY: 'auto' }} className="auth-form-panel">
                        <div style={{ maxWidth: 360, width: '100%', margin: '0 auto' }}>
                            <h1 style={{ fontSize: '1.625rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.375rem' }}>
                                Create Account
                            </h1>
                            <p style={{ color: '#64748b', fontSize: '0.9375rem', marginBottom: '1.75rem' }}>
                                Fill in your details to get started
                            </p>

                            {error ? (
                                <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: '1.25rem' }}>
                                    <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>{error}</p>
                                </div>
                            ) : null}

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {[
                                    { id: 'fullName',        label: 'Full Name',        type: 'text',     val: fullName,        set: setFullName,        auto: 'name',         ph: 'Enter your full name' },
                                    { id: 'reg-email',       label: 'Email Address',    type: 'email',    val: email,           set: setEmail,           auto: 'email',        ph: 'Enter your email' },
                                    { id: 'reg-password',    label: 'Password',         type: 'password', val: password,        set: setPassword,        auto: 'new-password', ph: 'Create a password (min 8 characters)' },
                                    { id: 'confirmPassword', label: 'Confirm Password', type: 'password', val: confirmPassword, set: setConfirmPassword, auto: 'new-password', ph: 'Confirm your password' },
                                ].map(function(field) {
                                    const err = errors[field.id === 'reg-email' ? 'email' : field.id === 'reg-password' ? 'password' : field.id]
                                    return (
                                        <div key={field.id}>
                                            <label htmlFor={field.id} style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.9375rem' }}>
                                                {field.label}
                                            </label>
                                            <input
                                                id={field.id}
                                                type={field.type}
                                                autoComplete={field.auto}
                                                placeholder={field.ph}
                                                value={field.val}
                                                onChange={function(e) { field.set(e.target.value) }}
                                                style={{ width: '100%', padding: '0.75rem 1rem', border: err ? '2px solid #ef4444' : '2px solid #f1f5f9', borderRadius: 8, fontSize: '1rem', color: '#1e293b', background: 'white', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                                onFocus={function(e) { if (!err) e.currentTarget.style.borderColor = '#2563eb' }}
                                                onBlur={function(e) { if (!err) e.currentTarget.style.borderColor = '#f1f5f9' }}
                                            />
                                            {err ? <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: 4 }}>{err}</p> : null}
                                        </div>
                                    )
                                })}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: '#2563eb', color: 'white', fontSize: '0.9375rem', fontWeight: 600, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: '0.25rem', fontFamily: 'inherit' }}
                                >
                                    {isLoading ? <><Spinner size="sm" /> Creating account...</> : 'Create Account'}
                                </button>
                            </form>

                            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                                {'Already have an account? '}
                                <Link to="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Sign In</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default RegisterPage
