import { useState, useCallback, createContext, useContext } from 'react'
import { Link } from 'react-router-dom'
import Navbar from './Navbar'
import { ToastContainer } from '../ui/Toast'

const ToastContext = createContext(null)

export const useToast = () => {
    const context = useContext(ToastContext)
    if (!context) throw new Error('useToast must be used inside Layout')
    return context
}

const Layout = ({ children }) => {
    const [toasts, setToasts] = useState([])

    const showToast = useCallback((message, type = 'info', duration = 4000) => {
        const id = 'toast_' + Date.now() + '_' + Math.random()
        setToasts((prev) => [...prev, { id, message, type, duration }])
    }, [])

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
    }, [])

    return (
        <ToastContext.Provider value={{ showToast }}>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--background)' }}>

                {/* Sticky top navbar */}
                <Navbar />

                {/* Page content */}
                <main style={{ flex: 1 }}>
                    {children}
                </main>

                {/* Footer — matches old project dark footer exactly */}
                <footer style={{ background: 'var(--dark)', color: 'white', padding: '3rem 1.5rem 1.25rem' }}>
                    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                            gap: '2rem',
                            marginBottom: '2.5rem',
                        }}>
                            {/* Brand */}
                            <div>
                                <span style={{
                                    fontWeight: 700,
                                    fontSize: '1.25rem',
                                    background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
                                    WebkitBackgroundClip: 'text',
                                    WebkitTextFillColor: 'transparent',
                                    backgroundClip: 'text',
                                    display: 'block',
                                    marginBottom: '0.75rem',
                                }}>
                                    SkillSwap
                                </span>
                                <p style={{ fontSize: '0.875rem', color: 'var(--light-gray)', lineHeight: 1.6 }}>
                                    AI-Powered Peer Skill Exchange Platform
                                </p>
                            </div>

                            {/* Quick Links */}
                            <div>
                                <h4 style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'white', marginBottom: '1rem' }}>
                                    Quick Links
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {[
                                        { label: 'Dashboard', to: '/dashboard' },
                                        { label: 'Matches',   to: '/matches'   },
                                        { label: 'Sessions',  to: '/sessions'  },
                                        { label: 'Messages',  to: '/messages'  },
                                    ].map(function(item) {
                                        return (
                                            <Link key={item.to} to={item.to} style={{ fontSize: '0.875rem', color: 'var(--light-gray)', textDecoration: 'none', transition: 'color 0.2s' }}
                                                onMouseEnter={function(e) { e.currentTarget.style.color = 'var(--primary-light)' }}
                                                onMouseLeave={function(e) { e.currentTarget.style.color = 'var(--light-gray)' }}
                                            >
                                                {item.label}
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Account */}
                            <div>
                                <h4 style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'white', marginBottom: '1rem' }}>
                                    Account
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {[
                                        { label: 'My Profile',   to: '/profile'      },
                                        { label: 'Edit Profile', to: '/profile/edit' },
                                        { label: 'Ratings',      to: '/ratings'      },
                                    ].map(function(item) {
                                        return (
                                            <Link key={item.to} to={item.to} style={{ fontSize: '0.875rem', color: 'var(--light-gray)', textDecoration: 'none' }}
                                                onMouseEnter={function(e) { e.currentTarget.style.color = 'var(--primary-light)' }}
                                                onMouseLeave={function(e) { e.currentTarget.style.color = 'var(--light-gray)' }}
                                            >
                                                {item.label}
                                            </Link>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Contact */}
                            <div>
                                <h4 style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'white', marginBottom: '1rem' }}>
                                    Contact
                                </h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--light-gray)' }}>support@skillswap.com</span>
                                    <span style={{ fontSize: '0.875rem', color: 'var(--light-gray)' }}>University of Peshawar</span>
                                </div>
                            </div>
                        </div>

                        {/* Footer bottom */}
                        <div style={{
                            borderTop: '1px solid rgba(255,255,255,0.1)',
                            paddingTop: '1.5rem',
                            textAlign: 'center',
                        }}>
                            <p style={{ fontSize: '0.875rem', color: 'var(--light-gray)' }}>
                                2026 SkillSwap. All rights reserved. Built as a Final Year Project.
                            </p>
                        </div>
                    </div>
                </footer>

                {/* Global toast notifications */}
                <ToastContainer toasts={toasts} removeToast={removeToast} />
            </div>
        </ToastContext.Provider>
    )
}

export default Layout