const jwt     = require('jsonwebtoken')
const Message = require('../models/Message')
const User    = require('../models/User')

/**
 * Verifies the JWT sent during the socket handshake.
 * Rejects the connection if no valid token is provided.
 */
const authenticateSocket = async (socket, next) => {
    try {
        const token = socket.handshake.auth?.token
        if (!token) return next(new Error('Authentication required'))
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        const user    = await User.findById(decoded.id).select('_id isActive fullName')
        if (!user || !user.isActive) return next(new Error('Invalid or inactive account'))
        socket.userId   = user._id.toString()
        socket.fullName = user.fullName
        next()
    } catch {
        next(new Error('Authentication failed'))
    }
}

function registerSocketHandlers(io) {
    io.use(authenticateSocket)

    // sessionId -> Set<userId>
    const sessionRooms = new Map()

    io.on('connection', (socket) => {
        if (process.env.NODE_ENV !== 'production') {
            console.log(`🟢 Client connected: ${socket.id} (user ${socket.userId})`)
        }

        // Personal notification room
        socket.join(`user_${socket.userId}`)

        // ── Chat ─────────────────────────────────────────────────────────────
        socket.on('send-message', async (data) => {
            const { receiverId, content } = data || {}
            if (!receiverId || !content || !content.trim()) {
                socket.emit('message-error', { message: 'receiverId and content are required' })
                return
            }
            try {
                const saved = await Message.create({
                    senderId:   socket.userId,
                    receiverId,
                    content:    content.trim(),
                })
                io.to(`user_${receiverId}`).emit('new-message', saved)
                io.to(`user_${socket.userId}`).emit('new-message', saved)
            } catch (error) {
                console.error('Failed to persist message:', error.message)
                socket.emit('message-error', { message: 'Failed to send message' })
            }
        })

        socket.on('typing', (data) => {
            const { receiverId, isTyping } = data || {}
            if (!receiverId) return
            io.to(`user_${receiverId}`).emit('user-typing', {
                userId:   socket.userId,
                isTyping: !!isTyping,
            })
        })

        // ── WebRTC Session Room ───────────────────────────────────────────────
        socket.on('join-session', ({ sessionId }) => {
            if (!sessionId) return
            const roomName = `session_${sessionId}`
            socket.join(roomName)
            socket.sessionId = sessionId

            if (!sessionRooms.has(sessionId)) sessionRooms.set(sessionId, new Set())
            sessionRooms.get(sessionId).add(socket.userId)

            const participants = [...sessionRooms.get(sessionId)]

            // Notify others that a new peer has arrived
            socket.to(roomName).emit('peer-joined', {
                userId:     socket.userId,
                fullName:   socket.fullName,
                socketId:   socket.id,
                count:      participants.length,
            })

            // Tell the joining peer who is already in the room
            socket.emit('session-participants', {
                participants,
                count: participants.length,
            })
        })

        socket.on('webrtc-offer', ({ sessionId, offer, targetUserId }) => {
            if (!sessionId || !offer) return
            const target = targetUserId ? `user_${targetUserId}` : `session_${sessionId}`
            socket.to(target).emit('webrtc-offer', {
                offer,
                fromUserId:   socket.userId,
                fromSocketId: socket.id,
            })
        })

        socket.on('webrtc-answer', ({ sessionId, answer, targetUserId }) => {
            if (!sessionId || !answer) return
            const target = targetUserId ? `user_${targetUserId}` : `session_${sessionId}`
            socket.to(target).emit('webrtc-answer', {
                answer,
                fromUserId:   socket.userId,
                fromSocketId: socket.id,
            })
        })

        socket.on('webrtc-ice-candidate', ({ sessionId, candidate, targetUserId }) => {
            if (!sessionId || !candidate) return
            const target = targetUserId ? `user_${targetUserId}` : `session_${sessionId}`
            socket.to(target).emit('webrtc-ice-candidate', {
                candidate,
                fromUserId:   socket.userId,
                fromSocketId: socket.id,
            })
        })

        socket.on('webrtc-toggle-audio', ({ sessionId, muted }) => {
            if (!sessionId) return
            socket.to(`session_${sessionId}`).emit('peer-audio-toggled', {
                userId: socket.userId,
                muted:  !!muted,
            })
        })

        socket.on('webrtc-toggle-video', ({ sessionId, videoOff }) => {
            if (!sessionId) return
            socket.to(`session_${sessionId}`).emit('peer-video-toggled', {
                userId:   socket.userId,
                videoOff: !!videoOff,
            })
        })

        socket.on('webrtc-screen-share', ({ sessionId, sharing }) => {
            if (!sessionId) return
            socket.to(`session_${sessionId}`).emit('peer-screen-share', {
                userId:  socket.userId,
                sharing: !!sharing,
            })
        })

        socket.on('leave-session', ({ sessionId }) => {
            if (!sessionId) return
            _leaveSession(socket, io, sessionId, sessionRooms)
        })

        // ── Disconnect ────────────────────────────────────────────────────────
        socket.on('disconnect', () => {
            if (process.env.NODE_ENV !== 'production') {
                console.log(`🔴 Client disconnected: ${socket.id} (user ${socket.userId})`)
            }
            if (socket.sessionId) {
                _leaveSession(socket, io, socket.sessionId, sessionRooms)
            }
        })
    })
}

function _leaveSession(socket, io, sessionId, sessionRooms) {
    const roomName = `session_${sessionId}`
    socket.leave(roomName)
    if (sessionRooms.has(sessionId)) {
        sessionRooms.get(sessionId).delete(socket.userId)
        if (sessionRooms.get(sessionId).size === 0) sessionRooms.delete(sessionId)
    }
    socket.to(roomName).emit('peer-left', {
        userId:   socket.userId,
        fullName: socket.fullName,
    })
}

module.exports = registerSocketHandlers