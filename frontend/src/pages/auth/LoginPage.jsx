import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
    loginUser,
    clearError,
    selectAuthLoading,
    selectAuthError,
    selectAuthErrorCode,
    selectAuthErrorEmail,
    selectIsAuthenticated,
} from '../../features/auth/authSlice'
import Spinner from '../../components/ui/Spinner'
import useResendVerification from '../../hooks/useResendVerification'

const FEATURES = [
    'Access your matches',
    'Manage sessions',
    'Track progress',
    'Connect with peers',
]

const LoginPage = function() {
    const dispatch        = useDispatch()
    const navigate        = useNavigate()
    const isLoading       = useSelector(selectAuthLoading)
    const error           = useSelector(selectAuthError)
    const isAuthenticated = useSelector(selectIsAuthenticated)
    const [searchParams]  = useSearchParams()
    const wasDeactivated  = searchParams.get('deactivated') === '1'
    const wasSignedOut    = searchParams.get('expired') === '1'
    const errorCode       = useSelector(selectAuthErrorCode)
    const errorEmail      = useSelector(selectAuthErrorEmail)
    const { resend, status: resendStatus, message: resendMessage } = useResendVerification()

    const [email,    setEmail]    = useState('')
    const [password, setPassword] = useState('')
    const [errors,   setErrors]   = useState({})

    useEffect(function() {
        if (isAuthenticated) navigate('/dashboard', { replace: true })
    }, [isAuthenticated, navigate])

    useEffect(function() {
        dispatch(clearError())
    }, [dispatch])

    const validate = function() {
        const errs = {}
        if (!email.trim())    errs.email    = 'Email is required'
        if (!password.trim()) errs.password = 'Password is required'
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
        const result = await dispatch(loginUser({ email, password }))
        if (loginUser.fulfilled.match(result)) {
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
                    <Link to="/" style={{ padding: '0.4rem 0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#4b5563', textDecoration: 'none' }}>Home</Link>
                    <Link to="/login" style={{ padding: '0.4375rem 1.125rem', fontSize: '0.875rem', fontWeight: 500, color: '#2563eb', border: '1.5px solid #2563eb', borderRadius: 8, textDecoration: 'none' }}>Login</Link>
                    <Link to="/register" style={{ padding: '0.4375rem 1.125rem', fontSize: '0.875rem', fontWeight: 600, color: 'white', background: '#2563eb', borderRadius: 8, textDecoration: 'none' }}>Sign Up</Link>
                </div>
            </nav>

            {/* Card — top padding includes an extra 64px to reserve the
                space the now-fixed navbar above no longer occupies in flow */}
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'calc(2rem + 64px) 1rem 2rem' }}>
                <div style={{ width: '100%', maxWidth: 900, background: 'white', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.1)', overflow: 'hidden', display: 'flex', minHeight: 520 }}>

                    {/* ── Left gradient panel — hidden on mobile (< 640px) ── */}
                    <div style={{
                        flex: '0 0 44%',
                        background: 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #7c3aed 100%)',
                        padding: '3rem 2.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        position: 'relative',
                        overflow: 'hidden',
                        // Hide below 640px — form takes full width on mobile
                        // We use a media query via a style tag injected once in index.css.
                        // Here we set the class and let the global rule handle it.
                    }} className="auth-left-panel">
                        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
                        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, background: 'rgba(255,255,255,0.06)', borderRadius: '50%' }} />
                        <div style={{ position: 'relative', zIndex: 1 }}>
                            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white', marginBottom: '0.75rem', lineHeight: 1.2 }}>Welcome Back!</h2>
                            <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9375rem', marginBottom: '2rem', lineHeight: 1.6 }}>
                                Continue your skill exchange journey with SkillSwap.
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

                    {/* ── Right form panel — full width on mobile ── */}
                    <div style={{ flex: 1, padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }} className="auth-form-panel">
                        <div style={{ maxWidth: 360, width: '100%', margin: '0 auto' }}>
                            <h1 style={{ fontSize: '1.625rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.375rem' }}>Login to Account</h1>
                            <p style={{ color: '#64748b', fontSize: '0.9375rem', marginBottom: '1.75rem' }}>Please enter your credentials to continue</p>

                            {error || wasDeactivated || wasSignedOut ? (
                                <div role="alert" style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: '1.25rem' }}>
                                    <p style={{ color: '#dc2626', fontSize: '0.875rem' }}>
                                        {error || (wasDeactivated
                                            ? 'Your account has been deactivated, so you were signed out. Contact support if you think this is a mistake.'
                                            : 'Your password was changed, so you were signed out. Please log in again.')}
                                    </p>
                                    {errorCode === 'EMAIL_NOT_VERIFIED' && (
                                        <div style={{ marginTop: '0.5rem' }}>
                                            {resendStatus === 'sent' ? (
                                                <p style={{ color: '#166534', fontSize: '0.8125rem' }}>{resendMessage}</p>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={function() { resend(errorEmail || email.trim()) }}
                                                    disabled={resendStatus === 'sending'}
                                                    style={{ background: 'none', border: 'none', padding: 0, color: '#2563eb', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', fontFamily: 'inherit' }}
                                                >
                                                    {resendStatus === 'sending' ? 'Sending...' : 'Resend verification email'}
                                                </button>
                                            )}
                                            {resendStatus === 'error' && <p style={{ color: '#dc2626', fontSize: '0.8125rem', marginTop: 4 }}>{resendMessage}</p>}
                                        </div>
                                    )}
                                </div>
                            ) : null}

                            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.125rem' }}>
                                <div>
                                    <label htmlFor="login-email" style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.9375rem' }}>
                                        Email Address
                                    </label>
                                    <input
                                        id="login-email"
                                        type="email"
                                        autoComplete="email"
                                        placeholder="Enter your email"
                                        value={email}
                                        onChange={function(e) { setEmail(e.target.value) }}
                                        style={{ width: '100%', padding: '0.75rem 1rem', border: errors.email ? '2px solid #ef4444' : '2px solid #f1f5f9', borderRadius: 8, fontSize: '1rem', color: '#1e293b', background: 'white', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                        onFocus={function(e) { if (!errors.email) e.currentTarget.style.borderColor = '#2563eb' }}
                                        onBlur={function(e) { if (!errors.email) e.currentTarget.style.borderColor = '#f1f5f9' }}
                                    />
                                    {errors.email ? <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: 4 }}>{errors.email}</p> : null}
                                </div>

                                <div>
                                    <label htmlFor="login-password" style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.9375rem' }}>
                                        Password
                                    </label>
                                    <input
                                        id="login-password"
                                        type="password"
                                        autoComplete="current-password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={function(e) { setPassword(e.target.value) }}
                                        style={{ width: '100%', padding: '0.75rem 1rem', border: errors.password ? '2px solid #ef4444' : '2px solid #f1f5f9', borderRadius: 8, fontSize: '1rem', color: '#1e293b', background: 'white', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
                                        onFocus={function(e) { if (!errors.password) e.currentTarget.style.borderColor = '#2563eb' }}
                                        onBlur={function(e) { if (!errors.password) e.currentTarget.style.borderColor = '#f1f5f9' }}
                                    />
                                    {errors.password ? <p style={{ color: '#ef4444', fontSize: '0.8125rem', marginTop: 4 }}>{errors.password}</p> : null}
                                    <div style={{ textAlign: 'right', marginTop: '0.375rem' }}>
                                        <Link to="/forgot-password" style={{ fontSize: '0.8125rem', color: '#2563eb', textDecoration: 'none' }}>Forgot password?</Link>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: 10, background: '#2563eb', color: 'white', fontSize: '0.9375rem', fontWeight: 600, border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit' }}
                                >
                                    {isLoading ? <><Spinner size="sm" /> Signing in...</> : 'Login'}
                                </button>
                            </form>

                            <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                                {"Don't have an account? "}
                                <Link to="/register" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>Sign Up</Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LoginPage
