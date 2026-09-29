import { Link } from 'react-router-dom'
import Footer from '../components/layout/Footer'

const NAV_ITEMS = [
    { label: 'Home',         href: '#home'         },
    { label: 'Features',     href: '#features'     },
    { label: 'How It Works', href: '#how-it-works' },
]

const FEATURES = [
    { icon: '🤖', title: 'AI-Powered Matching',  desc: 'Our intelligent algorithm matches you with the perfect learning partners based on skills, availability, and goals.',    color: '#2563eb' },
    { icon: '📅', title: 'Smart Scheduling',      desc: 'Easily schedule and manage your skill exchange sessions with integrated calendar tools.',                              color: '#7c3aed' },
    { icon: '📊', title: 'Progress Tracking',     desc: 'Visualize your learning journey with detailed analytics and achievement milestones.',                                 color: '#0891b2' },
    { icon: '⭐', title: 'Reputation System',     desc: 'Build trust through peer reviews and ratings after every completed session.',                                        color: '#d97706' },
    { icon: '🔒', title: 'Secure Platform',       desc: 'Your data and sessions are protected with enterprise-grade security measures.',                                      color: '#059669' },
    { icon: '👥', title: 'Growing Community',     desc: 'Join thousands of learners and teachers already exchanging skills on SkillSwap.',                                   color: '#db2777' },
]

const HOW_IT_WORKS = [
    { num: '1', title: 'Create Profile',    desc: 'Sign up and create your skill profile - list what you can teach and what you want to learn.', color: '#2563eb' },
    { num: '2', title: 'Get Matched',       desc: 'Our AI engine finds your perfect skill exchange partners based on compatibility.',              color: '#7c3aed' },
    { num: '3', title: 'Connect and Learn', desc: 'Schedule sessions, exchange knowledge, and grow together with your matched peers.',            color: '#0891b2' },
]

const AVATAR_COLORS = ['#60a5fa', '#a78bfa', '#34d399', '#f472b6']

const LandingPage = function () {
    const scrollTo = function (href) {
        const el = document.querySelector(href)
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }

    return (
        <div style={{ minHeight: '100vh', background: 'white', color: '#1e293b', fontFamily: 'Inter, system-ui, sans-serif' }}>

            {/* Navbar — fixed rather than sticky, same reason as the app's
                Navbar.jsx: overflow-x:hidden on html/body (see index.css)
                silently breaks position:sticky, but fixed is immune to it */}
            <nav style={{ position: 'fixed', top: 0, left: 0, width: '100%', zIndex: 40, background: 'white', borderBottom: '1px solid #e5e7eb', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
                    <span style={{ fontWeight: 700, fontSize: '1.375rem', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                        SkillSwap
                    </span>
                    <div className="landing-nav-items" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        {NAV_ITEMS.map(function (item) {
                            return (
                                <button
                                    key={item.label}
                                    onClick={function () { scrollTo(item.href) }}
                                    style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem', color: '#4b5563', background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
                                >
                                    {item.label}
                                </button>
                            )
                        })}
                        <Link to="/about" style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem', color: '#4b5563', textDecoration: 'none', borderRadius: 8 }}>About</Link>
                        <Link to="/contact" style={{ padding: '0.4rem 0.75rem', fontSize: '0.9rem', color: '#4b5563', textDecoration: 'none', borderRadius: 8 }}>Contact</Link>
                        <Link to="/login" style={{ marginLeft: 12, padding: '0.4375rem 1.125rem', fontSize: '0.9rem', fontWeight: 500, color: '#2563eb', border: '1.5px solid #2563eb', borderRadius: 8, textDecoration: 'none' }}>
                            Login
                        </Link>
                        <Link to="/register" style={{ padding: '0.4375rem 1.125rem', fontSize: '0.9rem', fontWeight: 600, color: 'white', background: '#2563eb', borderRadius: 8, textDecoration: 'none' }}>
                            Sign Up
                        </Link>
                    </div>
                    <div className="landing-nav-mobile" style={{ display: 'none', alignItems: 'center', gap: '0.5rem' }}>
                        <Link to="/login" style={{ padding: '0.375rem 0.875rem', fontSize: '0.875rem', fontWeight: 500, color: '#2563eb', border: '1.5px solid #2563eb', borderRadius: 8, textDecoration: 'none' }}>
                            Login
                        </Link>
                        <Link to="/register" style={{ padding: '0.375rem 0.875rem', fontSize: '0.875rem', fontWeight: 600, color: 'white', background: '#2563eb', borderRadius: 8, textDecoration: 'none' }}>
                            Sign Up
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero — top padding includes an extra 64px to reserve the
                space the now-fixed navbar above no longer occupies in flow */}
            <section id="home" style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #7c3aed 100%)', padding: 'calc(5rem + 64px) 1.5rem 6rem', position: 'relative', overflow: 'hidden', scrollMarginTop: 64 }}>
                <div style={{ position: 'absolute', top: '-20%', right: '-5%', width: 500, height: 500, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', bottom: '-20%', left: '-5%', width: 400, height: 400, background: 'rgba(124,58,237,0.2)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />
                <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: '4rem', flexWrap: 'wrap', position: 'relative', zIndex: 1 }}>

                    {/* Left: copy */}
                    <div style={{ flex: 1, minWidth: 300 }}>
                        <h1 style={{ fontSize: 'clamp(2.25rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, color: 'white', marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
                            Exchange Skills,
                            <br />
                            <span style={{ background: 'linear-gradient(135deg, #bfdbfe, #ddd6fe)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                                Grow Together
                            </span>
                        </h1>
                        <p style={{ fontSize: '1.0625rem', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, marginBottom: '2rem', maxWidth: 460 }}>
                            Connect with peers, share knowledge, and track your learning journey with AI-powered matching.
                        </p>
                        <div style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
                            <Link to="/register" style={{ padding: '0.75rem 2rem', borderRadius: 10, fontSize: '1rem', fontWeight: 700, color: '#1e40af', background: 'white', textDecoration: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
                                Get Started
                            </Link>
                            <button
                                onClick={function () { scrollTo('#how-it-works') }}
                                style={{ padding: '0.75rem 2rem', borderRadius: 10, fontSize: '1rem', fontWeight: 500, color: 'white', background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                                Learn More
                            </button>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '2rem' }}>
                            <div style={{ display: 'flex' }}>
                                {AVATAR_COLORS.map(function (color, i) {
                                    return (
                                        <div key={i} style={{ width: 30, height: 30, borderRadius: '50%', background: color, border: '2px solid rgba(255,255,255,0.3)', marginLeft: i > 0 ? -8 : 0 }} />
                                    )
                                })}
                            </div>
                            <p style={{ fontSize: '0.8125rem', color: 'rgba(255,255,255,0.8)' }}>
                                Join <strong style={{ color: 'white' }}>peers</strong> already learning
                            </p>
                        </div>
                    </div>

                    {/* Right: hero image */}
                    {/* Place your image at: frontend/public/images/hero.png */}
                    <div style={{ flex: '0 0 auto', width: 'clamp(260px, 38%, 440px)' }}>
                        <div style={{ borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.08)', aspectRatio: '4/3' }}>
                            <img
                                src="/images/skillswap.png"
                                alt="SkillSwap peer skill exchange platform"
                                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                            />
                        </div>
                        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginTop: '0.75rem' }}>
                            AI-powered skill exchange platform
                        </p>
                    </div>

                </div>
            </section>

            {/* Features */}
            <section id="features" style={{ padding: '5rem 1.5rem', background: '#f9fafb', scrollMarginTop: 64 }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: 'clamp(1.625rem, 3vw, 2.25rem)', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>
                            Why Choose SkillSwap?
                        </h2>
                        <p style={{ fontSize: '1rem', color: '#64748b', maxWidth: 480, margin: '0 auto' }}>
                            Intelligent features designed for effective peer learning
                        </p>
                    </div>
                    <div className="landing-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
                        {FEATURES.map(function (feature) {
                            return (
                                <div key={feature.title} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: '1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: feature.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.375rem', marginBottom: '1rem' }}>
                                        {feature.icon}
                                    </div>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
                                        {feature.title}
                                    </h3>
                                    <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.65 }}>
                                        {feature.desc}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" style={{ padding: '5rem 1.5rem', background: 'white', scrollMarginTop: 64 }}>
                <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                    <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
                        <h2 style={{ fontSize: 'clamp(1.625rem, 3vw, 2.25rem)', fontWeight: 700, color: '#1e293b', marginBottom: '0.75rem' }}>
                            How SkillSwap Works
                        </h2>
                        <p style={{ fontSize: '1rem', color: '#64748b', maxWidth: 440, margin: '0 auto' }}>
                            Get started in just a few simple steps
                        </p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
                        {HOW_IT_WORKS.map(function (item) {
                            return (
                                <div key={item.num} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: '2rem 1.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
                                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: item.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1.25rem' }}>
                                        <span style={{ fontWeight: 800, fontSize: '1.125rem', color: item.color }}>{item.num}</span>
                                    </div>
                                    <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.625rem' }}>
                                        {item.num + '. ' + item.title}
                                    </h3>
                                    <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.65 }}>
                                        {item.desc}
                                    </p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section style={{ padding: '5rem 1.5rem', background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #7c3aed 100%)', textAlign: 'center' }}>
                <div style={{ maxWidth: 560, margin: '0 auto' }}>
                    <h2 style={{ fontSize: 'clamp(1.625rem, 3vw, 2.25rem)', fontWeight: 700, color: 'white', marginBottom: '1rem' }}>
                        Ready to start exchanging skills?
                    </h2>
                    <p style={{ fontSize: '1rem', color: 'rgba(255,255,255,0.8)', marginBottom: '2rem', lineHeight: 1.7 }}>
                        Join learners already growing with SkillSwap. Free to get started.
                    </p>
                    <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Link to="/register" style={{ padding: '0.75rem 2rem', borderRadius: 10, fontSize: '1rem', fontWeight: 700, color: '#1e40af', background: 'white', textDecoration: 'none', boxShadow: '0 4px 14px rgba(0,0,0,0.2)' }}>
                            Create Free Account
                        </Link>
                        <Link to="/login" style={{ padding: '0.75rem 2rem', borderRadius: 10, fontSize: '1rem', fontWeight: 500, color: 'white', background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.3)', textDecoration: 'none' }}>
                            Sign In
                        </Link>
                    </div>
                </div>
            </section>

            {/* Shared site footer */}
            <Footer />

        </div>
    )
}

export default LandingPage