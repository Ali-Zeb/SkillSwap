import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../api/axios'

// Read from sessionStorage on startup — each tab has its own session
const token = sessionStorage.getItem('skillswap_token')
const user  = sessionStorage.getItem('skillswap_user')

const initialState = {
    user:            user ? JSON.parse(user) : null,
    token:           token || null,
    isAuthenticated: !!token,
    isLoading:       false,
    error:           null,
    errorCode:       null,
    errorEmail:      null,
}

// Keeps the server's machine-readable code (e.g. EMAIL_NOT_VERIFIED) next to the message.
const toAuthError = (error, fallback) => ({
    message: error.response?.data?.message || fallback,
    code:    error.response?.data?.code || null,
    email:   error.response?.data?.email || null,
})

export const registerUser = createAsyncThunk(
    'auth/register',
    async (userData, { rejectWithValue }) => {
        try {
            const { data } = await api.post('/auth/register', userData)
            return data
        } catch (error) {
            return rejectWithValue(toAuthError(error, 'Registration failed'))
        }
    }
)

export const loginUser = createAsyncThunk(
    'auth/login',
    async (credentials, { rejectWithValue }) => {
        try {
            const { data } = await api.post('/auth/login', credentials)
            return data
        } catch (error) {
            return rejectWithValue(toAuthError(error, 'Login failed'))
        }
    }
)

export const logoutUser = createAsyncThunk(
    'auth/logout',
    async () => {
        try { await api.post('/auth/logout') } catch (error) { console.error('Logout request failed:', error.message) }
    }
)

export const getMe = createAsyncThunk(
    'auth/getMe',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/auth/me')
            return data
        } catch (error) {
            return rejectWithValue(error.response?.data?.message || 'Failed to fetch user')
        }
    }
)

const saveToStorage = (token, user) => {
    sessionStorage.setItem('skillswap_token', token)
    sessionStorage.setItem('skillswap_user', JSON.stringify(user))
}

const clearStorage = () => {
    sessionStorage.removeItem('skillswap_token')
    sessionStorage.removeItem('skillswap_user')
}

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        setCredentials: (state, action) => {
            const { user, token } = action.payload
            if (user)  { state.user  = user;  sessionStorage.setItem('skillswap_user', JSON.stringify(user)) }
            if (token) { state.token = token; sessionStorage.setItem('skillswap_token', token) }
            state.isAuthenticated = true
        },
        clearError: (state) => {
            state.error      = null
            state.errorCode  = null
            state.errorEmail = null
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(registerUser.pending, (state) => {
                state.isLoading = true
                state.error = null
            })
            .addCase(registerUser.fulfilled, (state, action) => {
                state.isLoading = false
                state.error     = null
                state.errorCode = null
                // New accounts must verify their email first — no token yet.
                if (action.payload.token) {
                    state.isAuthenticated = true
                    state.user            = action.payload.user
                    state.token           = action.payload.token
                    saveToStorage(action.payload.token, action.payload.user)
                }
            })
            .addCase(registerUser.rejected, (state, action) => {
                state.isLoading  = false
                state.error      = action.payload?.message || action.payload || null
                state.errorCode  = action.payload?.code || null
                state.errorEmail = action.payload?.email || null
            })

        builder
            .addCase(loginUser.pending, (state) => {
                state.isLoading = true
                state.error     = null
            })
            .addCase(loginUser.fulfilled, (state, action) => {
                state.isLoading       = false
                state.isAuthenticated = true
                state.user            = action.payload.user
                state.token           = action.payload.token
                state.error           = null
                saveToStorage(action.payload.token, action.payload.user)
            })
            .addCase(loginUser.rejected, (state, action) => {
                state.isLoading  = false
                state.error      = action.payload?.message || action.payload || null
                state.errorCode  = action.payload?.code || null
                state.errorEmail = action.payload?.email || null
            })

        builder
            .addCase(logoutUser.fulfilled, (state) => {
                state.user            = null
                state.token           = null
                state.isAuthenticated = false
                state.error           = null
                clearStorage()
            })

        builder
            .addCase(getMe.pending, (state) => {
                state.isLoading = true
            })
            .addCase(getMe.fulfilled, (state, action) => {
                state.isLoading       = false
                state.user            = action.payload.user
                state.isAuthenticated = true
                sessionStorage.setItem('skillswap_user', JSON.stringify(action.payload.user))
            })
            .addCase(getMe.rejected, (state) => {
                state.isLoading       = false
                state.user            = null
                state.token           = null
                state.isAuthenticated = false
                clearStorage()
            })
    },
})

export const { setCredentials, clearError } = authSlice.actions

export const selectCurrentUser     = (state) => state.auth.user
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated
export const selectAuthLoading     = (state) => state.auth.isLoading
export const selectAuthError       = (state) => state.auth.error
export const selectAuthErrorCode   = (state) => state.auth.errorCode
export const selectAuthErrorEmail  = (state) => state.auth.errorEmail
export const selectToken           = (state) => state.auth.token
// UI-only gate; every /api/admin route is enforced server-side from the DB role.
export const selectIsAdmin         = (state) => state.auth.user?.role === 'admin'

export default authSlice.reducer