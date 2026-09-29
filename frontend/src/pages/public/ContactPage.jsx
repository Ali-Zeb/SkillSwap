import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { Mail, Clock, MapPin } from 'lucide-react'
import api from '../../api/axios'
import PublicLayout from '../../components/layout/PublicLayout'
import usePageMeta from '../../hooks/usePageMeta'
import { selectCurrentUser } from '../../features/auth/authSlice'
import { site, contact } from '../../content/siteContent'
import { PUBLIC_SUPPORT_CATEGORIES, SUPPORT_MESSAGE_MAX, SUPPORT_MESSAGE_MIN } from '../../utils/supportOptions'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Public contact form (no login) — creates a support ticket via the public
 * endpoint. Meant for people who can't sign in (locked out, deactivated).
 */
const ContactPage = function() {
    usePageMeta('Contact', contact.metaDescription)
    const user = useSelector(selectCurrentUser)
    const [form,   setForm]   = useState({ name: '', email: '', category: '', message: '' })
    const [status, setStatus] = useState('idle')   // idle | sending | sent
    const [error,  setError]  = useState(null)

    const set = function(key) { return function(e) { setForm({ ...form, [key]: e.target.value }) } }

    const submit = async function(e) {
        e.preventDefault()
        setError(null)
        if (form.name.trim().length < 2)                  { setError('Please enter your name'); return }
        if (!EMAIL_REGEX.test(form.email.trim()))          { setError('Please enter a valid email address'); return }
        if (!form.category)                                { setError('Please choose what your message is about'); return }
        if (form.message.trim().length < SUPPORT_MESSAGE_MIN) { setError('Please write at least ' + SUPPORT_MESSAGE_MIN + ' characters'); return }
        setStatus('sending')
        try {
            await api.post('/support/public', { name: form.name.trim(), email: form.email.trim(), category: form.category, message: form.message.trim() })
            setStatus('sent')
        } catch (err) {
            setStatus('idle')
            setError(err.response?.data?.message || 'Could not send your message. Please try again.')
        }
    }

    return (
        <PublicLayout>
            <section className="public-section public-section--narrow">
                <h1 className="public-page-title">Contact us</h1>
                <p className="public-text">{contact.intro}</p>

                <div className="public-contact-grid">
                    <div className="public-card">
                        {status === 'sent' ? (
                            <div role="status">
                                <h2 style={{ marginTop: 0 }}>Message sent</h2>
                                <p className="public-text">Thanks — we received your message and sent a confirmation to {form.email.trim()}. {site.responseTime}</p>
                                <Link to="/" className="public-cta">Back to home</Link>
                            </div>
                        ) : (
                            <form onSubmit={submit} noValidate>
                                {user && user.role !== 'admin' && (
                                    <p className="public-hint">{contact.memberHint} <Link to="/support">Go to Help & Support</Link></p>
                                )}
                                {error && <div role="alert" className="public-error">{error}</div>}
                                <div className="public-form-row">
                                    <div>
                                        <label htmlFor="c-name">Your name</label>
                                        <input id="c-name" type="text" autoComplete="name" maxLength={50} value={form.name} onChange={set('name')} />
                                    </div>
                                    <div>
                                        <label htmlFor="c-email">Email</label>
                                        <input id="c-email" type="email" autoComplete="email" value={form.email} onChange={set('email')} />
                                    </div>
                                </div>
                                <label htmlFor="c-category">What is it about?</label>
                                <select id="c-category" value={form.category} onChange={set('category')}>
                                    <option value="">Choose a topic</option>
                                    {PUBLIC_SUPPORT_CATEGORIES.map(function(c) { return <option key={c.value} value={c.value}>{c.label}</option> })}
                                </select>
                                <label htmlFor="c-message">Message</label>
                                <textarea id="c-message" rows={6} maxLength={SUPPORT_MESSAGE_MAX} value={form.message} onChange={set('message')} placeholder="How can we help?" />
                                <div className="public-form-foot">
                                    <span>{form.message.length}/{SUPPORT_MESSAGE_MAX}</span>
                                    <button type="submit" className="public-cta" disabled={status === 'sending'}>{status === 'sending' ? 'Sending...' : 'Send message'}</button>
                                </div>
                            </form>
                        )}
                    </div>

                    <aside className="public-card public-contact-info" aria-label="Other ways to reach us">
                        <p><Mail size={18} aria-hidden="true" /> <a href={'mailto:' + site.supportEmail}>{site.supportEmail}</a></p>
                        <p><Clock size={18} aria-hidden="true" /> {site.responseTime}</p>
                        <p><MapPin size={18} aria-hidden="true" /> {site.location}</p>
                    </aside>
                </div>
            </section>
        </PublicLayout>
    )
}

export default ContactPage
