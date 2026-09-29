import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { getMe, selectIsAuthenticated, selectToken, selectCurrentUser } from './features/auth/authSlice'

import Layout               from './components/layout/Layout'
import LandingPage          from './pages/LandingPage'
import LoginPage            from './pages/auth/LoginPage'
import RegisterPage         from './pages/auth/RegisterPage'
import DashboardPage        from './pages/DashboardPage'
import ProfilePage          from './pages/ProfilePage'
import EditProfilePage      from './pages/EditProfilePage'
import MatchesPage          from './pages/MatchesPage'
import RequestsPage         from './pages/RequestsPage'
import SessionsPage         from './pages/SessionsPage'
import SessionRoomPage      from './pages/SessionRoomPage'
import MessagesPage         from './pages/MessagesPage'
import RatingsPage          from './pages/RatingsPage'
import NotificationsPage    from './pages/NotificationsPage'
import MyReportsPage        from './pages/MyReportsPage'
import AdminDashboardPage   from './pages/admin/AdminDashboardPage'
import AdminUsersPage       from './pages/admin/AdminUsersPage'
import AdminReportsPage     from './pages/admin/AdminReportsPage'
import AdminSessionsPage    from './pages/admin/AdminSessionsPage'
import AdminAuditLogPage    from './pages/admin/AdminAuditLogPage'
import Spinner              from './components/ui/Spinner'

const NotFoundPage = function() {
    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem', background: '#f8fafc', fontFamily: 'Inter, sans-serif' }}>
            <h1 style={{ fontSize: '5rem', fontWeight: 800, background: 'linear-gradient(135deg, #2563eb, #7c3aed)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', margin: 0 }}>404</h1>
            <p style={{ color: '#64748b', fontSize: '1.125rem', margin: 0 }}>Page not found</p>
            <a href="/" style={{ padding: '0.625rem 1.5rem', borderRadius: 8, background: '#2563eb', color: 'white', textDecoration: 'none', fontSize: '0.9375rem', fontWeight: 600 }}>Go Home</a>
        </div>
    )
}

const ProtectedRoute = function({ children }) {
    const isAuthenticated = useSelector(selectIsAuthenticated)
    const tokenInStorage  = sessionStorage.getItem('skillswap_token')
    if (!isAuthenticated && !tokenInStorage) {
        return <Navigate to="/login" replace />
    }
    return <Layout>{children}</Layout>
}

// Client-side gate for the admin area. The real enforcement is server-side:
// every /api/admin route re-checks the role from the database.
const AdminRoute = function({ children }) {
    const isAuthenticated = useSelector(selectIsAuthenticated)
    const user            = useSelector(selectCurrentUser)
    const tokenInStorage  = sessionStorage.getItem('skillswap_token')
    if (!isAuthenticated && !tokenInStorage) {
        return <Navigate to="/login" replace />
    }
    if (!user) {
        return <Layout><div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}><Spinner size="lg" /></div></Layout>
    }
    if (user.role !== 'admin') {
        return <Navigate to="/dashboard" replace />
    }
    return <Layout>{children}</Layout>
}

const PublicRoute = function({ children }) {
    const isAuthenticated = useSelector(selectIsAuthenticated)
    const tokenInStorage  = sessionStorage.getItem('skillswap_token')
    if (isAuthenticated || tokenInStorage) {
        return <Navigate to="/dashboard" replace />
    }
    return children
}

const App = function() {
    const dispatch = useDispatch()
    const token    = useSelector(selectToken)

    useEffect(function() {
        const storedToken = sessionStorage.getItem('skillswap_token')
        if (token || storedToken) {
            dispatch(getMe())
        }
    }, [dispatch])

    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

            <Route path="/dashboard"        element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/profile/edit"     element={<ProtectedRoute><EditProfilePage /></ProtectedRoute>} />
            <Route path="/profile"          element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/profile/:id"      element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/matches"          element={<ProtectedRoute><MatchesPage /></ProtectedRoute>} />
            <Route path="/requests"         element={<ProtectedRoute><RequestsPage /></ProtectedRoute>} />
            <Route path="/sessions"         element={<ProtectedRoute><SessionsPage /></ProtectedRoute>} />
            <Route path="/session-room/:id" element={<ProtectedRoute><SessionRoomPage /></ProtectedRoute>} />
            <Route path="/messages"         element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="/messages/:userId" element={<ProtectedRoute><MessagesPage /></ProtectedRoute>} />
            <Route path="/ratings"          element={<ProtectedRoute><RatingsPage /></ProtectedRoute>} />
            <Route path="/notifications"    element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />
            <Route path="/reports"          element={<ProtectedRoute><MyReportsPage /></ProtectedRoute>} />

            <Route path="/admin"            element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
            <Route path="/admin/users"      element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
            <Route path="/admin/reports"    element={<AdminRoute><AdminReportsPage /></AdminRoute>} />
            <Route path="/admin/sessions"   element={<AdminRoute><AdminSessionsPage /></AdminRoute>} />
            <Route path="/admin/audit-logs" element={<AdminRoute><AdminAuditLogPage /></AdminRoute>} />

            <Route path="*" element={<NotFoundPage />} />
        </Routes>
    )
}

export default App