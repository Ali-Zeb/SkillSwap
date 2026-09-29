import { useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import api from '../../api/axios'
import { selectCurrentUser, setCredentials } from '../../features/auth/authSlice'
import AdminLayout from '../../components/layout/AdminLayout'
import { getAvatarUrl } from '../../utils/helpers'
import { getFullNameError, normalizeName } from '../../utils/validators'

const PASSWORD_MIN = 8
const card   = { padding: '1.25rem', marginBottom: '1.25rem' }
const label  = { display: 'block', fontWeight: 500, color: '#1e293b', marginBottom: '0.375rem', fontSize: '0.9375rem' }
const input  = { width: '100%', padding: '0.625rem 0.875rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.9375rem', fontFamily: 'inherit', boxSizing: 'border-box', color: '#1e293b' }
const notice = function(kind) {
    return kind === 'error'
        ? { padding: '0.625rem 0.875rem', borderRadius: 8, background: '#fef2f2', color: '#b91c1c', fontSize: '0.875rem', marginBottom: '0.875rem' }
        : { padding: '0.625rem 0.875rem', borderRadius: 8, background: '#f0fdf4', color: '#166534', fontSize: '0.875rem', marginBottom: '0.875rem' }
}

/**
 * Admin account settings: name, avatar and password only. Admins have no
 * member profile (skills, availability, badges, reputation).
 */
const AdminSettingsPage = function() {
    const dispatch = useDispatch()
    const user     = useSelector(selectCurrentUser)
    const fileRef  = useRef(null)

    const [name,       setName]       = useState(user?.fullName || '')
    const [profileMsg, setProfileMsg] = useState(null)
    const [savingName, setSavingName] = useState(false)
    const [uploading,  setUploading]  = useState(false)

    const [pw,        setPw]        = useState({ current: '', next: '', confirm: '' })
    const [pwMsg,     setPwMsg]     = useState(null)
    const [savingPw,  setSavingPw]  = useState(false)

    const saveName = async function(e) {
        e.preventDefault()
        const fullName = normalizeName(name)
        const nameError = getFullNameError(fullName)
        if (nameError) { setProfileMsg({ kind: 'error', text: nameError }); return }
        setSavingName(true)
        setProfileMsg(null)
        try {
            const { data } = await api.put('/users/profile', { fullName })
            dispatch(setCredentials({ user: data.user }))
            setName(data.user.fullName)
            setProfileMsg({ kind: 'success', text: 'Name updated.' })
        } catch (err) {
            setProfileMsg({ kind: 'error', text: err.response?.data?.message || 'Could not update your name' })
        } finally {
            setSavingName(false)
        }
    }

    const uploadAvatar = async function(e) {
        const file = e.target.files?.[0]
        e.target.value = ''
        if (!file) return
        if (file.size > 2 * 1024 * 1024) { setProfileMsg({ kind: 'error', text: 'Image must be 2 MB or smaller' }); return }
        const form = new FormData()
        form.append('avatar', file)
        setUploading(true)
        setProfileMsg(null)
        try {
            const { data } = await api.put('/users/avatar', form)
            dispatch(setCredentials({ user: data.user }))
            setProfileMsg({ kind: 'success', text: 'Photo updated.' })
        } catch (err) {
            setProfileMsg({ kind: 'error', text: err.response?.data?.message || 'Could not upload the photo' })
        } finally {
            setUploading(false)
        }
    }

    const changePassword = async function(e) {
        e.preventDefault()
        setPwMsg(null)
        if (pw.next.length < PASSWORD_MIN) { setPwMsg({ kind: 'error', text: 'New password must be at least ' + PASSWORD_MIN + ' characters' }); return }
        if (pw.next !== pw.confirm)        { setPwMsg({ kind: 'error', text: 'New passwords do not match' }); return }
        setSavingPw(true)
        try {
            const { data } = await api.put('/users/password', { currentPassword: pw.current, newPassword: pw.next })
            // The old token is now revoked — keep this browser signed in with the new one.
            dispatch(setCredentials({ token: data.token }))
            setPw({ current: '', next: '', confirm: '' })
            setPwMsg({ kind: 'success', text: data.message })
        } catch (err) {
            setPwMsg({ kind: 'error', text: err.response?.data?.message || 'Could not change your password' })
        } finally {
            setSavingPw(false)
        }
    }

    return (
        <AdminLayout title="Account settings" subtitle="Your admin account">
            <div style={{ maxWidth: 560 }}>
                <section className="admin-card" style={card} aria-labelledby="profile-heading">
                    <h2 id="profile-heading" style={{ fontSize: '1.0625rem', fontWeight: 700, margin: '0 0 1rem', color: '#1e293b' }}>Profile</h2>
                    {profileMsg && <div role={profileMsg.kind === 'error' ? 'alert' : 'status'} style={notice(profileMsg.kind)}>{profileMsg.text}</div>}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                        <img src={getAvatarUrl(user?.avatar, user?.fullName)} alt="" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                        <div>
                            <button type="button" className="admin-btn" disabled={uploading} onClick={function() { fileRef.current?.click() }}>
                                {uploading ? 'Uploading...' : 'Change photo'}
                            </button>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.375rem 0 0' }}>JPEG, PNG, WEBP or GIF · max 2 MB</p>
                            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={uploadAvatar} style={{ display: 'none' }} />
                        </div>
                    </div>

                    <form onSubmit={saveName} noValidate>
                        <label htmlFor="admin-name" style={label}>Full name</label>
                        <input id="admin-name" type="text" value={name} maxLength={50} onChange={function(e) { setName(e.target.value) }} style={{ ...input, marginBottom: '0.875rem' }} autoComplete="name" />
                        <label style={label}>Email</label>
                        <p style={{ margin: '0 0 1rem', color: '#475569', fontSize: '0.9375rem', overflowWrap: 'anywhere' }}>{user?.email}</p>
                        <button type="submit" className="admin-btn admin-btn--primary" disabled={savingName || normalizeName(name) === user?.fullName}>
                            {savingName ? 'Saving...' : 'Save name'}
                        </button>
                    </form>
                </section>

                <section className="admin-card" style={card} aria-labelledby="password-heading">
                    <h2 id="password-heading" style={{ fontSize: '1.0625rem', fontWeight: 700, margin: '0 0 0.375rem', color: '#1e293b' }}>Password</h2>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: '0 0 1rem' }}>Changing it signs you out on all other devices.</p>
                    {pwMsg && <div role={pwMsg.kind === 'error' ? 'alert' : 'status'} style={notice(pwMsg.kind)}>{pwMsg.text}</div>}
                    <form onSubmit={changePassword} noValidate>
                        <label htmlFor="pw-current" style={label}>Current password</label>
                        <input id="pw-current" type="password" value={pw.current} autoComplete="current-password" onChange={function(e) { setPw({ ...pw, current: e.target.value }) }} style={{ ...input, marginBottom: '0.875rem' }} />
                        <label htmlFor="pw-new" style={label}>New password</label>
                        <input id="pw-new" type="password" value={pw.next} autoComplete="new-password" onChange={function(e) { setPw({ ...pw, next: e.target.value }) }} style={{ ...input, marginBottom: '0.875rem' }} />
                        <label htmlFor="pw-confirm" style={label}>Confirm new password</label>
                        <input id="pw-confirm" type="password" value={pw.confirm} autoComplete="new-password" onChange={function(e) { setPw({ ...pw, confirm: e.target.value }) }} style={{ ...input, marginBottom: '1rem' }} />
                        <button type="submit" className="admin-btn admin-btn--primary" disabled={savingPw || !pw.current || !pw.next}>
                            {savingPw ? 'Updating...' : 'Update password'}
                        </button>
                    </form>
                </section>
            </div>
        </AdminLayout>
    )
}

export default AdminSettingsPage
