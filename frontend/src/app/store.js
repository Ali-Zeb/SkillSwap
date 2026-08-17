import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'

export const store = configureStore({
    reducer: {
        auth: authReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types to avoid warnings from
                // non-serializable values like Date objects in payloads
                ignoredActions: ['auth/setCredentials'],
            },
        }),
    devTools: import.meta.env.MODE !== 'production',
})

export default store
