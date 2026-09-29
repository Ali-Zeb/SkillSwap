import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import api from '../../api/axios'
import { selectCurrentUser } from '../../features/auth/authSlice'
import AdminLayout from '../../components/layout/AdminLayout'
import Pagination from '../../components/ui/Pagination'
import Spinner from '../../components/ui/Spinner'
import useAdminList from '../../hooks/useAdminList'
import { UserX, UserCheck, ShieldCheck, ShieldOff } from 'lucide-react'
import { getAvatarUrl } from '../../utils/helpers'

// "Sep 29, 2026" — keeps the Joined column on one line.
const formatShortDate = function(date) {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const DeactivateDialog = function({ user, onCancel, onConfirm, busy, error }) {
    const [reason, setReason] = useState('')
    return (
        <div role="presentation" onClick={busy ? undefined : onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000 }}>
            <form
                role="dialog" aria-modal="true" aria-labelledby="deactivate-title"
                onClick={function(e) { e.stopPropagation() }}
                onSubmit={function(e) { e.preventDefault(); onConfirm(reason.trim()) }}
                style={{ width: '100%', maxWidth: 440, background: 'white', borderRadius: 14, padding: '1.5rem', boxSizing: 'border-box' }}
            >
                <h2 id="deactivate-title" style={{ fontSize: '1.125rem', fontWeight: 700, margin: '0 0 0.5rem', color: '#1e293b' }}>Deactivate {user.fullName}?</h2>
                <p style={{ color: '#64748b', fontSize: '0.875rem', margin: '0 0 1rem' }}>
                    They will be signed out immediately and cannot log in or use chat until reactivated. The reason is shown to them at login.
                </p>
                <label htmlFor="deactivate-reason" style={{ display: 'block', fontWeight: 500, marginBottom: 6, color: '#1e293b' }}>Reason</label>
                <textarea id="deactivate-reason" value={reason} maxLength={500} rows={3} required autoFocus
                    onChange={function(e) { setReason(e.target.value) }}
                    style={{ width: '100%', padding: '0.625rem 0.875rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontFamily: 'inherit', fontSize: '0.9375rem', boxSizing: 'border-box', resize: 'vertical' }} />
                {error && <p role="alert" style={{ color: '#dc2626', fontSize: '0.875rem', margin: '0.5rem 0 0' }}>{error}</p>}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
                    <button type="button" className="admin-btn" onClick={onCancel} disabled={busy}>Cancel</button>
                    <button type="submit" className="admin-btn admin-btn--danger" disabled={busy || !reason.trim()}>{busy ? 'Deactivating...' : 'Deactivate'}</button>
                </div>
            </form>
        </div>
    )
}

const AdminUsersPage = function() {
    const me = useSelector(selectCurrentUser)
    const [searchInput, setSearchInput] = useState('')
    const [search,      setSearch]      = useState('')
    const [role,        setRole]        = useState('')
    const [status,      setStatus]      = useState('')
    const [page,        setPage]        = useState(1)
    const [busyId,      setBusyId]      = useState(null)
    const [actionError, setActionError] = useState(null)
    const [dialogUser,  setDialogUser]  = useState(null)
    const [dialogError, setDialogError] = useState(null)

    // Debounce the search box so typing doesn't fire a request per keystroke.
    useEffect(function() {
        const t = setTimeout(function() { setSearch(searchInput.trim()); setPage(1) }, 350)
        return function() { clearTimeout(t) }
    }, [searchInput])

    const { items: users, setItems, pagination, loading, error } =
        useAdminList('/admin/users', { search, role, status, page, limit: 20 })

    const patchUser = function(id, changes) {
        setItems(function(list) { return list.map(function(u) { return u._id === id ? { ...u, ...changes } : u }) })
    }

    const changeRole = async function(user) {
        const nextRole = user.role === 'admin' ? 'user' : 'admin'
        const verb = nextRole === 'admin' ? 'Make ' + user.fullName + ' an admin?' : 'Remove admin rights from ' + user.fullName + '?'
        if (!window.confirm(verb)) return
        setActionError(null)
        setBusyId(user._id)
        try {
            await api.patch('/admin/users/' + user._id + '/role', { role: nextRole })
            patchUser(user._id, { role: nextRole })
        } catch (err) {
            setActionError(err.response?.data?.message || 'Failed to change role')
        } finally {
            setBusyId(null)
        }
    }

    const activate = async function(user) {
        setActionError(null)
        setBusyId(user._id)
        try {
            const { data } = await api.patch('/admin/users/' + user._id + '/status', { isActive: true })
            patchUser(user._id, data.user)
        } catch (err) {
            setActionError(err.response?.data?.message || 'Failed to reactivate')
        } finally {
            setBusyId(null)
        }
    }

    const deactivate = async function(reason) {
        const user = dialogUser
        setDialogError(null)
        setBusyId(user._id)
        try {
            const { data } = await api.patch('/admin/users/' + user._id + '/status', { isActive: false, reason })
            patchUser(user._id, data.user)
            setDialogUser(null)
        } catch (err) {
            setDialogError(err.response?.data?.message || 'Failed to deactivate')
        } finally {
            setBusyId(null)
        }
    }

    return (
        <AdminLayout title="Users" subtitle="Search accounts, manage roles and access">
            <div className="admin-filters">
                <input type="search" placeholder="Search name or email" aria-label="Search users" value={searchInput} maxLength={100}
                    onChange={function(e) { setSearchInput(e.target.value) }} />
                <select aria-label="Filter by role" value={role} onChange={function(e) { setRole(e.target.value); setPage(1) }}>
                    <option value="">All roles</option>
                    <option value="user">Users</option>
                    <option value="admin">Admins</option>
                </select>
                <select aria-label="Filter by status" value={status} onChange={function(e) { setStatus(e.target.value); setPage(1) }}>
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="inactive">Deactivated</option>
                </select>
            </div>

            {(error || actionError) && (
                <div role="alert" style={{ padding: '0.75rem 1rem', borderRadius: 10, background: '#fef2f2', color: '#b91c1c', marginBottom: '1rem' }}>{error || actionError}</div>
            )}

            <div className="admin-card">
                {loading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}><Spinner size="lg" /></div>
                ) : users.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#64748b', padding: '2.5rem 1rem', margin: 0 }}>No users match these filters.</p>
                ) : (
                    <div className="admin-table-wrap">
                        <table className="admin-table">
                            <thead>
                                <tr><th>User</th><th>Role</th><th>Status</th><th>Joined</th><th>Actions</th></tr>
                            </thead>
                            <tbody>
                                {users.map(function(u) {
                                    const isMe = u._id === me?._id
                                    const busy = busyId === u._id
                                    return (
                                        <tr key={u._id}>
                                            <td data-label="User">
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0 }}>
                                                    <img src={getAvatarUrl(u.avatar, u.fullName)} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                                                    <div style={{ minWidth: 0 }}>
                                                        <span style={{ fontWeight: 600, color: '#1e293b' }}>{u.fullName}{isMe ? ' (you)' : ''}</span>
                                                        <div style={{ fontSize: '0.8125rem', color: '#64748b', overflowWrap: 'anywhere' }}>{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td data-label="Role">
                                                <span className="admin-badge" style={u.role === 'admin' ? { background: '#ede9fe', color: '#6d28d9' } : { background: '#f1f5f9', color: '#475569' }}>
                                                    {u.role === 'admin' ? 'Admin' : 'User'}
                                                </span>
                                            </td>
                                            <td data-label="Status">
                                                <span className="admin-badge" style={u.isActive ? { background: '#dcfce7', color: '#166534' } : { background: '#fee2e2', color: '#991b1b' }}>
                                                    {u.isActive ? 'Active' : 'Deactivated'}
                                                </span>
                                                {!u.isActive && u.deactivationReason && (
                                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4, maxWidth: 240, overflowWrap: 'anywhere' }}>{u.deactivationReason}</div>
                                                )}
                                            </td>
                                            <td data-label="Joined" style={{ whiteSpace: 'nowrap' }}>{formatShortDate(u.createdAt)}</td>
                                            <td data-label="Actions" style={{ whiteSpace: 'nowrap' }}>
                                                {isMe ? (
                                                    <span style={{ fontSize: '0.8125rem', color: '#94a3b8' }}>—</span>
                                                ) : (
                                                    // One row: access change on the left, role change on the right
                                                    <div className="admin-actions">
                                                        {u.isActive ? (
                                                            <button type="button" className="admin-btn admin-btn--sm admin-btn--danger" disabled={busy}
                                                                onClick={function() { setDialogError(null); setDialogUser(u) }}>
                                                                <UserX size={14} aria-hidden="true" /> Deactivate
                                                            </button>
                                                        ) : (
                                                            <button type="button" className="admin-btn admin-btn--sm admin-btn--success" disabled={busy} onClick={function() { activate(u) }}>
                                                                <UserCheck size={14} aria-hidden="true" /> Reactivate
                                                            </button>
                                                        )}
                                                        <button type="button" className="admin-btn admin-btn--sm" disabled={busy} onClick={function() { changeRole(u) }}>
                                                            {u.role === 'admin'
                                                                ? <><ShieldOff size={14} aria-hidden="true" /> Remove admin</>
                                                                : <><ShieldCheck size={14} aria-hidden="true" /> Make admin</>}
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <Pagination pagination={pagination} onPageChange={setPage} disabled={loading} />

            {dialogUser && (
                <DeactivateDialog user={dialogUser} busy={busyId === dialogUser._id} error={dialogError}
                    onCancel={function() { setDialogUser(null) }} onConfirm={deactivate} />
            )}
        </AdminLayout>
    )
}

export default AdminUsersPage
