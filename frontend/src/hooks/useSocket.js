import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useSelector } from 'react-redux'
import { selectToken, selectIsAuthenticated } from '../features/auth/authSlice'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

const useSocket = () => {
    const socketRef = useRef(null)
    const token = useSelector(selectToken)
    const isAuthenticated = useSelector(selectIsAuthenticated)

    useEffect(() => {
        // Only connect if the user is authenticated
        if (!isAuthenticated || !token) {
            if (socketRef.current) {
                socketRef.current.disconnect()
                socketRef.current = null
            }
            return
        }

        // Create the socket connection with the JWT in the handshake,
        // matching the authenticateSocket middleware in backend/socket/index.js
        socketRef.current = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        })

        const socket = socketRef.current

        socket.on('connect', () => {
            console.log('🟢 Socket connected:', socket.id)
        })

        socket.on('disconnect', (reason) => {
            console.log('🔴 Socket disconnected:', reason)
        })

        socket.on('connect_error', (error) => {
            console.error('Socket connection error:', error.message)
        })

        // Cleanup on unmount or when auth state changes
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect()
                socketRef.current = null
            }
        }
    }, [isAuthenticated, token])

    // Stable emit function so components don't need direct socket access
    const emit = useCallback((event, data) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, data)
        } else {
            console.warn(`Socket not connected — could not emit "${event}"`)
        }
    }, [])

    // Subscribe to a socket event, returns a cleanup function
    const on = useCallback((event, callback) => {
        if (socketRef.current) {
            socketRef.current.on(event, callback)
            return () => socketRef.current?.off(event, callback)
        }
        return () => {}
    }, [])

    return {
        socket: socketRef.current,
        emit,
        on,
    }
}

export default useSocket