import { useEffect, useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { selectCurrentUser, setCredentials } from '../features/auth/authSlice'
import api from '../api/axios'
import Spinner from '../components/ui/Spinner'
import { getAvatarUrl } from '../utils/helpers'
const SKILL_CATEGORIES = [
    'Technology', 'Programming', 'Design', 'Business', 'Marketing',
    'Music', 'Art', 'Language', 'Science', 'Mathematics', 'Other',
]
const PROFICIENCY_LEVELS = [
    { value: 'beginner',     label: 'Beginner'    },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced',     label: 'Advanced'     },
    { value: 'expert',       label: 'Expert'       },
]
const PROFICIENCY_COLORS = {
    beginner:     { bg: '#dbeafe', color: '#1d4ed8' },
    intermediate: { bg: '#e0e7ff', color: '#4338ca' },
    advanced:     { bg: '#d1fae5', color: '#065f46' },
    expert:       { bg: '#fce7f3', color: '#be185d' },
}
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const EditProfilePage = function() {
    const dispatch  = useDispatch()
    const navigate  = useNavigate()
    const user      = useSelector(selectCurrentUser)
    const [activeTab,       setActiveTab]       = useState('info')
    const [saving,          setSaving]          = useState(false)
    const [success,         setSuccess]         = useState(null)
    const [error,           setError]           = useState(null)
    const [avatarPreview,   setAvatarPreview]   = useState(null)
    const [avatarError,     setAvatarError]     = useState(false)
    const [uploadingAvatar, setUploadingAvatar] = useState(false)
    const [addingSkill,     setAddingSkill]     = useState(false)
    const [removingSkill,   setRemovingSkill]   = useState(null)
    const fileInputRef = useRef(null)
    const [form, setForm] = useState({
        fullName: '',
        headline: '',
        about:    '',
        location: '',
    })
    // BUG FIX: skills must come from API (fully populated) not Redux state.
    // Redux stores skills with skillId as raw ObjectId — no .name or .category.
    // We maintain a local skills state populated from GET /users/profile.
    const [skills,   setSkills]   = useState([])
    const [newSkill, setNewSkill] = useState({ name: '', category: 'Technology', type: 'teach', proficiency: 'intermediate' })
    const [availability, setAvailability] = useState(
        DAYS.map(function(day) { return { day: day, available: false, startTime: '09:00', endTime: '17:00' } })
    )
    // Fetch fully populated profile from API on mount so skill names display correctly.
    useEffect(function() {
        const fetchProfile = async function() {
            try {
                const { data } = await api.get('/users/profile')
                const u = data.user
                setForm({
                    fullName: u.fullName || '',
                    headline: u.headline || '',
                    about:    u.about    || '',
                    location: u.location || '',
                })
                // Skills from API have populated skillId objects with .name and .category
                setSkills(u.skills || [])
                if (u.availability && u.availability.length > 0) {
                    setAvailability(DAYS.map(function(day) {
                        const existing = u.availability.find(function(a) { return a.day === day })
                        return existing
                            ? { ...existing, available: true }
                            : { day: day, available: false, startTime: '09:00', endTime: '17:00' }
                    }))
                }
                if (u.avatar) {
                    const path    = u.avatar
                    const fullUrl = path.startsWith('http')
                        ? path
                        : (import.meta.env.VITE_API_URL || 'http://localhost:5000') + (path.startsWith('/') ? path : '/uploads/' + path) + '?t=' + Date.now()
                    setAvatarPreview(fullUrl)
                    setAvatarError(false)
                }
            } catch {
                // Fall back to Redux state if API fails
                if (user) {
                    setForm({
                        fullName: user.fullName || '',
                        headline: user.headline || '',
                        about:    user.about    || '',
                        location: user.location || '',
                    })
                    setSkills(user.skills || [])
                }
            }
        }
        fetchProfile()
    }, [])
    const handleAvatarChange = async function(e) {
        const file = e.target.files[0]
        if (!file) return
        const localPreview = URL.createObjectURL(file)
        setAvatarPreview(localPreview)
        setAvatarError(false)
        setUploadingAvatar(true)
        try {
            const formData = new FormData()
            formData.append('avatar', file)
            const { data } = await api.put('/users/avatar', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            dispatch(setCredentials({ user: data.user }))
            const avatarPath = data.user.avatar || ''
            const fullUrl = avatarPath.startsWith('http')
                ? avatarPath
                : (import.meta.env.VITE_API_URL || 'http://localhost:5000') + (avatarPath.startsWith('/') ? '' : '/uploads/') + avatarPath.replace('/uploads/', '') + '?t=' + Date.now()
            setAvatarPreview(fullUrl)
            setAvatarError(false)
            setSuccess('Profile photo updated!')
            setTimeout(function() { setSuccess(null) }, 3000)
        } catch {
            setError('Failed to upload photo. Please try again.')
            setAvatarPreview(null)
            setAvatarError(true)
        } finally {
            setUploadingAvatar(false)
        }
    }
    const handleInfoSave = async function(e) {
        e.preventDefault()
        setSaving(true)
        setError(null)
        setSuccess(null)
        try {
            const { data } = await api.put('/users/profile', form)
            dispatch(setCredentials({ user: data.user }))
            setSuccess('Profile updated successfully!')
            setTimeout(function() { setSuccess(null) }, 3000)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile')
        } finally {
            setSaving(false)
        }
    }
    const handleAddSkill = async function() {
        if (!newSkill.name.trim()) { setError('Please enter a skill name'); return }
        setAddingSkill(true)
        setError(null)
        try {
            const skillRes = await api.post('/skills', { name: newSkill.name, category: newSkill.category })
            const skillId  = skillRes.data.skill._id
            const { data } = await api.post('/users/skills', {
                skillId:     skillId,
                type:        newSkill.type,
                proficiency: newSkill.proficiency,
            })
            dispatch(setCredentials({ user: data.user }))
            // Fetch fresh populated skills from API so names display correctly
            const profileRes = await api.get('/users/profile')
            setSkills(profileRes.data.user.skills || [])
            setNewSkill({ name: '', category: 'Technology', type: 'teach', proficiency: 'intermediate' })
            setSuccess('Skill added!')
            setTimeout(function() { setSuccess(null) }, 2000)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add skill')
        } finally {
            setAddingSkill(false)
        }
    }
    const handleRemoveSkill = async function(skillId, skillType) {
        // BUG FIX: Backend route is DELETE /users/skills/:skillId/:type
        // The original code called api.delete('/users/skills/' + skillId)
        // which omitted the required :type segment, causing 404 → "Failed to remove skill".
        if (!skillId || !skillType) {
            setError('Cannot remove this skill — missing skill data')
            return
        }
        setRemovingSkill(skillId)
        setError(null)
        try {
            const { data } = await api.delete('/users/skills/' + skillId + '/' + skillType)
            dispatch(setCredentials({ user: data.user }))
            // Fetch fresh populated skills so names remain correct
            const profileRes = await api.get('/users/profile')
            setSkills(profileRes.data.user.skills || [])
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to remove skill')
        } finally {
            setRemovingSkill(null)
        }
    }
    const handleAvailabilitySave = async function() {
        setSaving(true)
        setError(null)
        try {
            const activeSlots = availability.filter(function(s) { return s.available })
            const { data } = await api.put('/users/availability', { availability: activeSlots })
            dispatch(setCredentials({ user: data.user }))
            setSuccess('Availability saved!')
            setTimeout(function() { setSuccess(null) }, 3000)
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save availability')
        } finally {
            setSaving(false)
        }
    }
    const teachSkills = skills.filter(function(s) { return s.type === 'teach' })
    const learnSkills = skills.filter(function(s) { return s.type === 'learn' })
    const TABS = [
        { id: 'info',         label: 'Info'         },
        { id: 'skills',       label: 'Skills'       },
        { id: 'availability', label: 'Availability' },
    ]
    return (
        <div style={{ background: 'var(--background)', minHeight: '100vh', padding: '2rem 1.25rem' }}>
            <div style={{ maxWidth: 900, margin: '0 auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.75rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>
                            Edit Profile
                        </h1>
                        <p style={{ color: '#64748b', fontSize: '0.9375rem' }}>
                            Keep your profile up to date to attract better matches
                        </p>
                    </div>
                    <Link
                        to="/profile"
                        style={{ padding: '0.5625rem 1.25rem', border: '1.5px solid #2563eb', color: '#2563eb', borderRadius: 8, textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem', background: 'white' }}
                    >
                        View Profile
                    </Link>
                </div>
                {/* Banners */}
                {success ? (
                    <div style={{ padding: '0.875rem 1rem', background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 10, marginBottom: '1.25rem' }}>
                        <p style={{ color: '#065f46', fontWeight: 600, fontSize: '0.9375rem' }}>{success}</p>
                    </div>
                ) : null}
                {error ? (
                    <div style={{ padding: '0.875rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, marginBottom: '1.25rem' }}>
                        <p style={{ color: '#dc2626', fontSize: '0.9rem' }}>{error}</p>
                    </div>
                ) : null}
                {/* Tabs */}
                <div className="edit-profile-tabs" style={{ borderBottom: '2px solid #f1f5f9', marginBottom: '1.5rem', display: 'flex' }}>
                    {TABS.map(function(tab) {
                        const active = activeTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                onClick={function() { setActiveTab(tab.id); setError(null) }}
                                style={{ padding: '0.75rem 1.5rem', border: 'none', background: 'none', color: active ? '#2563eb' : '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.9375rem', position: 'relative', borderBottom: active ? '3px solid #2563eb' : '3px solid transparent', marginBottom: -2, transition: 'color 0.2s', fontFamily: 'inherit' }}
                            >
                                {tab.label}
                            </button>
                        )
                    })}
                </div>
                {/* INFO TAB */}
                {activeTab === 'info' ? (
                    <div style={{ background: 'white', borderRadius: 20, padding: '2rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', paddingBottom: '2rem', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <div style={{ width: 100, height: 100, borderRadius: '50%', overflow: 'hidden', border: '4px solid white', boxShadow: '0 4px 14px rgba(0,0,0,0.15)' }}>
                                    {avatarPreview && !avatarError ? (
                                        <img
                                            src={avatarPreview}
                                            alt={user?.fullName}
                                            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                                            onError={function() { setAvatarError(true) }}
                                        />
                                    ) : (
                                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '2.5rem', fontWeight: 700 }}>
                                            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                                        </div>
                                    )}
                                </div>
                                {uploadingAvatar ? (
                                    <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Spinner size="sm" />
                                    </div>
                                ) : null}
                            </div>
                            <div>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    style={{ display: 'none' }}
                                    onChange={handleAvatarChange}
                                />
                                <button
                                    onClick={function() { fileInputRef.current?.click() }}
                                    disabled={uploadingAvatar}
                                    style={{ padding: '0.5rem 1.25rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.875rem', cursor: uploadingAvatar ? 'not-allowed' : 'pointer', opacity: uploadingAvatar ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 6, marginBottom: '0.5rem', fontFamily: 'inherit' }}
                                >
                                    {uploadingAvatar ? <><Spinner size="sm" /> Uploading...</> : 'Change Photo'}
                                </button>
                                <p style={{ fontSize: '0.8125rem', color: '#64748b' }}>JPEG, PNG or WEBP · Max 2MB</p>
                            </div>
                        </div>
                        <form onSubmit={handleInfoSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.9375rem' }}>Full Name</label>
                                <input type="text" value={form.fullName} onChange={function(e) { setForm(function(p) { return { ...p, fullName: e.target.value } }) }} style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #f1f5f9', borderRadius: 8, fontSize: '1rem', color: '#1e293b', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} onFocus={function(e) { e.currentTarget.style.borderColor = '#2563eb' }} onBlur={function(e) { e.currentTarget.style.borderColor = '#f1f5f9' }} required />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.9375rem' }}>Headline <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span></label>
                                <input type="text" value={form.headline} onChange={function(e) { setForm(function(p) { return { ...p, headline: e.target.value } }) }} placeholder="e.g. Full Stack Developer and Guitar Teacher" style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #f1f5f9', borderRadius: 8, fontSize: '1rem', color: '#1e293b', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} onFocus={function(e) { e.currentTarget.style.borderColor = '#2563eb' }} onBlur={function(e) { e.currentTarget.style.borderColor = '#f1f5f9' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.9375rem' }}>Location <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span></label>
                                <input type="text" value={form.location} onChange={function(e) { setForm(function(p) { return { ...p, location: e.target.value } }) }} placeholder="e.g. Peshawar, Pakistan" style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #f1f5f9', borderRadius: 8, fontSize: '1rem', color: '#1e293b', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} onFocus={function(e) { e.currentTarget.style.borderColor = '#2563eb' }} onBlur={function(e) { e.currentTarget.style.borderColor = '#f1f5f9' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.9375rem' }}>About <span style={{ color: '#64748b', fontWeight: 400 }}>(optional)</span></label>
                                <textarea value={form.about} onChange={function(e) { setForm(function(p) { return { ...p, about: e.target.value } }) }} placeholder="Tell others about yourself..." rows={4} style={{ width: '100%', padding: '0.75rem 1rem', border: '2px solid #f1f5f9', borderRadius: 8, fontSize: '1rem', color: '#1e293b', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', resize: 'vertical' }} onFocus={function(e) { e.currentTarget.style.borderColor = '#2563eb' }} onBlur={function(e) { e.currentTarget.style.borderColor = '#f1f5f9' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <Link to="/profile" style={{ padding: '0.625rem 1.375rem', border: '1.5px solid #e2e8f0', borderRadius: 8, color: '#1e293b', textDecoration: 'none', fontWeight: 600, fontSize: '0.9375rem', background: 'white' }}>Cancel</Link>
                                <button type="submit" disabled={saving} style={{ padding: '0.625rem 1.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.9375rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}>
                                    {saving ? <><Spinner size="sm" /> Saving...</> : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                ) : null}
                {/* SKILLS TAB */}
                {activeTab === 'skills' ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        <div style={{ background: 'white', borderRadius: 20, padding: '1.75rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.25rem' }}>Add a Skill</h3>
                            <div className="skill-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '0.875rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Skill Name</label>
                                    <input type="text" value={newSkill.name} onChange={function(e) { setNewSkill(function(p) { return { ...p, name: e.target.value } }) }} placeholder="e.g. Python, Guitar, Photoshop" style={{ width: '100%', padding: '0.625rem 0.875rem', border: '2px solid #f1f5f9', borderRadius: 8, fontSize: '0.9375rem', color: '#1e293b', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} onFocus={function(e) { e.currentTarget.style.borderColor = '#2563eb' }} onBlur={function(e) { e.currentTarget.style.borderColor = '#f1f5f9' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Category</label>
                                    <select value={newSkill.category} onChange={function(e) { setNewSkill(function(p) { return { ...p, category: e.target.value } }) }} style={{ width: '100%', padding: '0.625rem 0.875rem', border: '2px solid #f1f5f9', borderRadius: 8, fontSize: '0.9375rem', color: '#1e293b', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', background: 'white' }}>
                                        {SKILL_CATEGORIES.map(function(cat) { return <option key={cat} value={cat}>{cat}</option> })}
                                    </select>
                                </div>
                            </div>
                            <div className="skill-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.875rem' }}>I want to</label>
                                    <div style={{ display: 'flex', gap: '0.625rem' }}>
                                        {[{ value: 'teach', label: 'Teach this' }, { value: 'learn', label: 'Learn this' }].map(function(opt) {
                                            const selected = newSkill.type === opt.value
                                            return (
                                                <button key={opt.value} type="button" onClick={function() { setNewSkill(function(p) { return { ...p, type: opt.value } }) }} style={{ flex: 1, padding: '0.625rem', border: selected ? '2px solid #2563eb' : '2px solid #f1f5f9', borderRadius: 8, background: selected ? '#eff6ff' : 'white', color: selected ? '#2563eb' : '#64748b', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                                                    {opt.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.5rem', fontSize: '0.875rem' }}>Proficiency</label>
                                    <select value={newSkill.proficiency} onChange={function(e) { setNewSkill(function(p) { return { ...p, proficiency: e.target.value } }) }} style={{ width: '100%', padding: '0.625rem 0.875rem', border: '2px solid #f1f5f9', borderRadius: 8, fontSize: '0.9375rem', color: '#1e293b', fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none', background: 'white' }}>
                                        {PROFICIENCY_LEVELS.map(function(lvl) { return <option key={lvl.value} value={lvl.value}>{lvl.label}</option> })}
                                    </select>
                                </div>
                            </div>
                            <button onClick={handleAddSkill} disabled={addingSkill || !newSkill.name.trim()} style={{ width: '100%', padding: '0.75rem', background: newSkill.name.trim() ? '#2563eb' : '#e2e8f0', color: newSkill.name.trim() ? 'white' : '#64748b', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.9375rem', cursor: (addingSkill || !newSkill.name.trim()) ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontFamily: 'inherit', transition: 'all 0.2s' }}>
                                {addingSkill ? <><Spinner size="sm" /> Adding...</> : '+ Add Skill'}
                            </button>
                        </div>
                        {/* Teaching skills list */}
                        <div style={{ background: 'white', borderRadius: 20, padding: '1.75rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
                                {'Skills I Teach (' + teachSkills.length + ')'}
                            </h3>
                            {teachSkills.length === 0 ? (
                                <p style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>No teaching skills added yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                    {teachSkills.map(function(s) {
                                        const prof  = s.proficiency || 'intermediate'
                                        const pc    = PROFICIENCY_COLORS[prof] || PROFICIENCY_COLORS.intermediate
                                        const sid   = s.skillId?._id || s.skillId
                                        const sname = s.skillId?.name || s.skillId?.toString?.() || 'Unknown'
                                        const scat  = s.skillId?.category || ''
                                        const isRemoving = removingSkill === sid
                                        return (
                                            <div key={sid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>{sname}</span>
                                                    <span style={{ padding: '0.1875rem 0.625rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: pc.bg, color: pc.color }}>{prof.charAt(0).toUpperCase() + prof.slice(1)}</span>
                                                    {scat ? <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{scat}</span> : null}
                                                </div>
                                                <button
                                                    onClick={function() { handleRemoveSkill(sid, 'teach') }}
                                                    disabled={!!removingSkill}
                                                    style={{ width: 28, height: 28, borderRadius: '50%', background: isRemoving ? '#f1f5f9' : '#fee2e2', color: '#dc2626', border: 'none', cursor: removingSkill ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                                >
                                                    {isRemoving ? '…' : '✕'}
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                        {/* Learning skills list */}
                        <div style={{ background: 'white', borderRadius: 20, padding: '1.75rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                            <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#7c3aed', display: 'inline-block' }} />
                                {'Skills I Want to Learn (' + learnSkills.length + ')'}
                            </h3>
                            {learnSkills.length === 0 ? (
                                <p style={{ color: '#64748b', fontSize: '0.9rem', fontStyle: 'italic' }}>No learning goals added yet.</p>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                                    {learnSkills.map(function(s) {
                                        const prof  = s.proficiency || 'intermediate'
                                        const pc    = PROFICIENCY_COLORS[prof] || PROFICIENCY_COLORS.intermediate
                                        const sid   = s.skillId?._id || s.skillId
                                        const sname = s.skillId?.name || 'Unknown'
                                        const isRemoving = removingSkill === sid
                                        return (
                                            <div key={sid} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                                    <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem' }}>{sname}</span>
                                                    <span style={{ padding: '0.1875rem 0.625rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, background: pc.bg, color: pc.color }}>{prof.charAt(0).toUpperCase() + prof.slice(1)}</span>
                                                </div>
                                                <button
                                                    onClick={function() { handleRemoveSkill(sid, 'learn') }}
                                                    disabled={!!removingSkill}
                                                    style={{ width: 28, height: 28, borderRadius: '50%', background: isRemoving ? '#f1f5f9' : '#fee2e2', color: '#dc2626', border: 'none', cursor: removingSkill ? 'not-allowed' : 'pointer', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                                                >
                                                    {isRemoving ? '…' : '✕'}
                                                </button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                ) : null}
                {/* AVAILABILITY TAB */}
                {activeTab === 'availability' ? (
                    <div style={{ background: 'white', borderRadius: 20, padding: '1.75rem', boxShadow: '0 5px 20px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#1e293b', marginBottom: '1.25rem' }}>Weekly Availability</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                            {availability.map(function(slot, idx) {
                                return (
                                    <div key={slot.day} className="availability-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', background: slot.available ? '#f0f9ff' : '#f8fafc', borderRadius: 10, border: slot.available ? '1px solid #bae6fd' : '1px solid #e2e8f0', flexWrap: 'wrap' }}>
                                        <div className="availability-day-label" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 140 }}>
                                            <input type="checkbox" checked={slot.available} onChange={function() { setAvailability(function(prev) { return prev.map(function(s, i) { return i === idx ? { ...s, available: !s.available } : s }) }) }} style={{ width: 18, height: 18, accentColor: '#2563eb', cursor: 'pointer' }} />
                                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9375rem', minWidth: 90 }}>{slot.day}</span>
                                        </div>
                                        {slot.available ? (
                                            <div className="availability-times" style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                                                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>From</span>
                                                <input type="time" value={slot.startTime} onChange={function(e) { const val = e.target.value; setAvailability(function(prev) { return prev.map(function(s, i) { return i === idx ? { ...s, startTime: val } : s }) }) }} style={{ padding: '0.375rem 0.625rem', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: '0.875rem', fontFamily: 'inherit', color: '#1e293b', outline: 'none' }} />
                                                <span style={{ fontSize: '0.875rem', color: '#64748b' }}>To</span>
                                                <input type="time" value={slot.endTime} onChange={function(e) { const val = e.target.value; setAvailability(function(prev) { return prev.map(function(s, i) { return i === idx ? { ...s, endTime: val } : s }) }) }} style={{ padding: '0.375rem 0.625rem', border: '1.5px solid #e2e8f0', borderRadius: 6, fontSize: '0.875rem', fontFamily: 'inherit', color: '#1e293b', outline: 'none' }} />
                                            </div>
                                        ) : (
                                            <span style={{ fontSize: '0.875rem', color: '#64748b', fontStyle: 'italic' }}>Unavailable</span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={handleAvailabilitySave} disabled={saving} style={{ padding: '0.625rem 1.5rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: '0.9375rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'inherit' }}>
                                {saving ? <><Spinner size="sm" /> Saving...</> : 'Save Availability'}
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>
        </div>
    )
}
export default EditProfilePage