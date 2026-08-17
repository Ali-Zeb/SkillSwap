import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectCurrentUser, selectToken } from '../features/auth/authSlice'
import { io } from 'socket.io-client'
import api from '../api/axios'
import Spinner from '../components/ui/Spinner'
import { getAvatarUrl } from '../utils/helpers'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'
const API_URL    = import.meta.env.VITE_API_URL    || 'http://localhost:5000'

const ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
    ],
}

const STATUS_CONFIG = {
    waiting:    { label: 'Waiting for partner', dot: 'sr-dot--idle'    },
    connecting: { label: 'Connecting',          dot: 'sr-dot--pending' },
    connected:  { label: 'Connected',           dot: 'sr-dot--live'    },
}

const SessionRoomPage = function () {
    const { id }      = useParams()
    const navigate    = useNavigate()
    const currentUser = useSelector(selectCurrentUser)
    const token       = useSelector(selectToken)

    const [session,       setSession]       = useState(null)
    const [loading,       setLoading]       = useState(true)
    const [error,         setError]         = useState(null)
    const [elapsed,       setElapsed]       = useState(0)
    const [notes,         setNotes]         = useState([])
    const [newNote,       setNewNote]       = useState('')
    const [muted,         setMuted]         = useState(false)
    const [videoOff,      setVideoOff]      = useState(false)
    const [sharing,       setSharing]       = useState(false)
    const [peerMuted,     setPeerMuted]     = useState(false)
    const [peerVideoOff,  setPeerVideoOff]  = useState(false)
    const [peerSharing,   setPeerSharing]   = useState(false)
    const [peerConnected, setPeerConnected] = useState(false)
    const [mediaError,    setMediaError]    = useState(null)
    const [callStatus,    setCallStatus]    = useState('waiting')
    const [recording,     setRecording]     = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const [messages,      setMessages]      = useState([])
    const [newMessage,    setNewMessage]    = useState('')
    const [uploadingFile, setUploadingFile] = useState(false)
    const [mobileTab,     setMobileTab]     = useState('chat')

    const socketRef        = useRef(null)
    const localStreamRef   = useRef(null)
    const screenStreamRef  = useRef(null)
    const pcRef            = useRef(null)
    const localVideoRef    = useRef(null)
    const remoteVideoRef   = useRef(null)
    const screenVideoRef   = useRef(null)
    const chatEndRef       = useRef(null)
    const timerRef         = useRef(null)
    const recordTimerRef   = useRef(null)
    const mediaRecRef      = useRef(null)
    const fileInputRef     = useRef(null)
    const partnerUserIdRef = useRef(null)

    /* ── Load session + message history ─────────────────────────────────── */
    useEffect(function () {
        const fetchSession = async function () {
            setLoading(true)
            try {
                const { data } = await api.get('/sessions/' + id)
                if (data.session.status === 'pending_approval') {
                    navigate('/sessions', { replace: true })
                    return
                }
                setSession(data.session)
                const sess      = data.session
                const isTeach   = sess.teacherId?._id === currentUser?._id || sess.teacherId === currentUser?._id
                const partnerId = isTeach
                    ? (sess.learnerId?._id || sess.learnerId)
                    : (sess.teacherId?._id || sess.teacherId)
                if (partnerId) {
                    try {
                        const msgRes = await api.get('/messages/' + partnerId)
                        setMessages(msgRes.data.messages || [])
                    } catch { /* History unavailable — live messages still work */ }
                }
            } catch {
                setError('Session not found or you do not have access.')
            } finally {
                setLoading(false)
            }
        }
        if (id) fetchSession()
    }, [id])

    /* ── Session timer ───────────────────────────────────────────────────── */
    useEffect(function () {
        timerRef.current = setInterval(function () {
            setElapsed(function (p) { return p + 1 })
        }, 1000)
        return function () { clearInterval(timerRef.current) }
    }, [])

    /* ── Auto-scroll chat ────────────────────────────────────────────────── */
    useEffect(function () {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    /* ── WebRTC: create peer connection ──────────────────────────────────── */
    const createPeerConnection = useCallback(function (partnerId) {
        if (pcRef.current) pcRef.current.close()
        const pc = new RTCPeerConnection(ICE_SERVERS)
        pcRef.current = pc
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(function (t) {
                pc.addTrack(t, localStreamRef.current)
            })
        }
        pc.ontrack = function (ev) {
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = ev.streams[0]
            setCallStatus('connected')
            setPeerConnected(true)
        }
        pc.onicecandidate = function (ev) {
            if (ev.candidate && socketRef.current?.connected) {
                socketRef.current.emit('webrtc-ice-candidate', {
                    sessionId: id, candidate: ev.candidate, targetUserId: partnerId,
                })
            }
        }
        pc.onconnectionstatechange = function () {
            if (pc.connectionState === 'connected') {
                setCallStatus('connected')
                setPeerConnected(true)
            } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
                setCallStatus('waiting')
                setPeerConnected(false)
            }
        }
        return pc
    }, [id])

    /* ── WebRTC: start local media ───────────────────────────────────────── */
    const startLocalMedia = useCallback(async function () {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: 1280, height: 720, facingMode: 'user' },
                audio: { echoCancellation: true, noiseSuppression: true },
            })
            localStreamRef.current = stream
            if (localVideoRef.current) localVideoRef.current.srcObject = stream
            setMediaError(null)
            return stream
        } catch (err) {
            setMediaError('Camera or microphone access denied. Please allow access and reload.')
            console.error('getUserMedia:', err)
            return null
        }
    }, [])

    /* ── Socket + WebRTC signaling ───────────────────────────────────────── */
    useEffect(function () {
        if (!token || !id) return
        const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] })
        socketRef.current = socket

        socket.on('new-message', function (msg) {
            setMessages(function (prev) {
                if (prev.some(function (m) { return m._id === msg._id })) return prev
                return [...prev, msg]
            })
        })
        socket.on('session-participants', function ({ participants }) {
            if (participants.length >= 2) setCallStatus('connecting')
        })
        socket.on('peer-joined', async function ({ userId }) {
            partnerUserIdRef.current = userId
            setCallStatus('connecting')
            await startLocalMedia()
            const pc = createPeerConnection(userId)
            try {
                const offer = await pc.createOffer()
                await pc.setLocalDescription(offer)
                socket.emit('webrtc-offer', { sessionId: id, offer, targetUserId: userId })
            } catch (err) { console.error('offer:', err) }
        })
        socket.on('webrtc-offer', async function ({ offer, fromUserId }) {
            partnerUserIdRef.current = fromUserId
            setCallStatus('connecting')
            if (!localStreamRef.current) await startLocalMedia()
            const pc = createPeerConnection(fromUserId)
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(offer))
                const answer = await pc.createAnswer()
                await pc.setLocalDescription(answer)
                socket.emit('webrtc-answer', { sessionId: id, answer, targetUserId: fromUserId })
            } catch (err) { console.error('answer:', err) }
        })
        socket.on('webrtc-answer', async function ({ answer }) {
            if (pcRef.current) {
                try { await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer)) }
                catch (err) { console.error('setRemote:', err) }
            }
        })
        socket.on('webrtc-ice-candidate', async function ({ candidate }) {
            if (pcRef.current && candidate) {
                try { await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate)) }
                catch (err) { console.error('ICE:', err) }
            }
        })
        socket.on('peer-audio-toggled',  function ({ muted })    { setPeerMuted(muted) })
        socket.on('peer-video-toggled',  function ({ videoOff }) { setPeerVideoOff(videoOff) })
        socket.on('peer-screen-share',   function ({ sharing })  { setPeerSharing(sharing) })
        socket.on('peer-left', function () {
            setPeerConnected(false)
            setCallStatus('waiting')
            if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
        })

        const initRoom = async function () {
            await startLocalMedia()
            socket.emit('join-session', { sessionId: id })
        }
        initRoom()

        return function () {
            socket.emit('leave-session', { sessionId: id })
            socket.disconnect()
            socketRef.current = null
            localStreamRef.current?.getTracks().forEach(function (t) { t.stop() })
            screenStreamRef.current?.getTracks().forEach(function (t) { t.stop() })
            if (pcRef.current) { pcRef.current.close(); pcRef.current = null }
        }
    }, [token, id])

    /* ── Controls ────────────────────────────────────────────────────────── */
    const toggleMute = useCallback(function () {
        if (!localStreamRef.current) return
        const track = localStreamRef.current.getAudioTracks()[0]
        if (!track) return
        track.enabled = muted
        const next = !muted
        setMuted(next)
        socketRef.current?.emit('webrtc-toggle-audio', { sessionId: id, muted: next })
    }, [muted, id])

    const toggleVideo = useCallback(function () {
        if (!localStreamRef.current) return
        const track = localStreamRef.current.getVideoTracks()[0]
        if (!track) return
        track.enabled = videoOff
        const next = !videoOff
        setVideoOff(next)
        socketRef.current?.emit('webrtc-toggle-video', { sessionId: id, videoOff: next })
    }, [videoOff, id])

    const toggleScreenShare = useCallback(async function () {
        if (sharing) {
            screenStreamRef.current?.getTracks().forEach(function (t) { t.stop() })
            screenStreamRef.current = null
            if (screenVideoRef.current) screenVideoRef.current.srcObject = null
            setSharing(false)
            socketRef.current?.emit('webrtc-screen-share', { sessionId: id, sharing: false })
            if (pcRef.current && localStreamRef.current) {
                const camTrack = localStreamRef.current.getVideoTracks()[0]
                const sender   = pcRef.current.getSenders().find(function (s) { return s.track?.kind === 'video' })
                if (sender && camTrack) sender.replaceTrack(camTrack)
            }
        } else {
            try {
                const ss = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: 'always' }, audio: false })
                screenStreamRef.current = ss
                if (screenVideoRef.current) screenVideoRef.current.srcObject = ss
                setSharing(true)
                socketRef.current?.emit('webrtc-screen-share', { sessionId: id, sharing: true })
                const screenTrack = ss.getVideoTracks()[0]
                if (pcRef.current && screenTrack) {
                    const sender = pcRef.current.getSenders().find(function (s) { return s.track?.kind === 'video' })
                    if (sender) sender.replaceTrack(screenTrack)
                }
                screenTrack.onended = function () { toggleScreenShare() }
            } catch (err) {
                if (err.name !== 'NotAllowedError') setError('Screen share failed. Please try again.')
            }
        }
    }, [sharing, id])

    const startRecording = useCallback(function () {
        if (typeof MediaRecorder === 'undefined') {
            setError('Recording is not supported on this browser. Please use Chrome or Firefox.')
            return
        }
        if (!localStreamRef.current) { setError('No media stream available to record.'); return }
        const tracks = []
        localStreamRef.current.getTracks().forEach(function (t) { tracks.push(t) })
        const rs       = new MediaStream(tracks)
        const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
        const rec      = new MediaRecorder(rs, { mimeType })
        mediaRecRef.current = rec
        const chunks = []
        rec.ondataavailable = function (e) { if (e.data.size > 0) chunks.push(e.data) }
        rec.onstop = function () {
            const blob = new Blob(chunks, { type: mimeType })
            const url  = URL.createObjectURL(blob)
            const a    = document.createElement('a')
            a.href     = url
            a.download = 'SkillSwap-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.webm'
            a.click()
            URL.revokeObjectURL(url)
        }
        rec.start(1000)
        setRecording(true)
        setRecordingTime(0)
        recordTimerRef.current = setInterval(function () {
            setRecordingTime(function (p) { return p + 1 })
        }, 1000)
    }, [])

    const stopRecording = useCallback(function () {
        if (mediaRecRef.current && mediaRecRef.current.state !== 'inactive') mediaRecRef.current.stop()
        clearInterval(recordTimerRef.current)
        setRecording(false)
        setRecordingTime(0)
    }, [])

    const sendMessage = useCallback(function () {
        if (!newMessage.trim() || !socketRef.current?.connected) return
        const partner = session?.teacherId?._id === currentUser?._id ? session.learnerId : session.teacherId
        if (partner?._id) {
            socketRef.current.emit('send-message', { receiverId: partner._id, content: newMessage.trim() })
            setNewMessage('')
        }
    }, [newMessage, session, currentUser])

    const handleKey = useCallback(function (e) {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    }, [sendMessage])

    const handleFileSelect = useCallback(async function (e) {
        const file = e.target.files[0]
        if (!file) return
        e.target.value = ''
        const partner = session?.teacherId?._id === currentUser?._id ? session.learnerId : session.teacherId
        if (!partner?._id) return
        if (file.size > 10 * 1024 * 1024) { setError('File too large. Maximum size is 10 MB.'); return }
        setUploadingFile(true)
        try {
            const fd = new FormData()
            fd.append('file', file)
            fd.append('receiverId', partner._id)
            const { data } = await api.post('/messages/file', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
            setMessages(function (prev) {
                if (prev.some(function (m) { return m._id === data.message._id })) return prev
                return [...prev, data.message]
            })
            if (socketRef.current?.connected) {
                socketRef.current.emit('send-message', { receiverId: partner._id, content: '📎 ' + file.name })
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send file.')
        } finally {
            setUploadingFile(false)
        }
    }, [session, currentUser])

    const addNote = useCallback(function () {
        if (!newNote.trim()) return
        setNotes(function (prev) {
            return [...prev, {
                text: newNote.trim(),
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            }]
        })
        setNewNote('')
    }, [newNote])

    const handleLeave = useCallback(async function () {
        stopRecording()
        try { await api.put('/sessions/' + id + '/complete') } catch {}
        navigate('/sessions')
    }, [id, navigate, stopRecording])

    /* ── Format helpers ──────────────────────────────────────────────────── */
    const formatElapsed = useMemo(function () {
        return function (secs) {
            const h = Math.floor(secs / 3600)
            const m = Math.floor((secs % 3600) / 60).toString().padStart(2, '0')
            const s = (secs % 60).toString().padStart(2, '0')
            return h > 0 ? h + ':' + m + ':' + s : m + ':' + s
        }
    }, [])

    const formatRecTime = useMemo(function () {
        return function (secs) {
            return Math.floor(secs / 60).toString().padStart(2, '0') + ':' + (secs % 60).toString().padStart(2, '0')
        }
    }, [])

    const isImage = useMemo(function () {
        return function (url) {
            if (!url) return false
            return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)
        }
    }, [])

    /* ── Loading state ───────────────────────────────────────────────────── */
    if (loading) {
        return (
            <div className="sr-fullpage-center sr-bg-dark">
                <div className="sr-loading-inner">
                    <Spinner size="lg" />
                    <p className="sr-loading-text">Joining session room...</p>
                </div>
            </div>
        )
    }

    /* ── Error state ─────────────────────────────────────────────────────── */
    if (error && !session) {
        return (
            <div className="sr-fullpage-center sr-bg-dark">
                <div className="sr-error-card">
                    <div className="sr-error-icon">⚠️</div>
                    <p className="sr-error-title">{error}</p>
                    <Link to="/sessions" className="sr-btn sr-btn--primary">Back to Sessions</Link>
                </div>
            </div>
        )
    }

    const isTeacher = session?.teacherId?._id === currentUser?._id
    const partner   = isTeacher ? session?.learnerId : session?.teacherId
    const statusCfg = STATUS_CONFIG[callStatus] || STATUS_CONFIG.waiting

    /* ── Message list ────────────────────────────────────────────────────── */
    const messageList = messages.length === 0
        ? (
            <div className="sr-chat-empty">
                <span className="sr-chat-empty-icon">💬</span>
                <p>No messages yet. Say hello!</p>
            </div>
        )
        : messages.map(function (msg, idx) {
            const isMine  = msg.senderId === currentUser?._id || msg.senderId?._id === currentUser?._id
            const hasFile = Boolean(msg.fileUrl)
            const time    = new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
            return (
                <div key={msg._id || idx} className={'sr-msg-row ' + (isMine ? 'sr-msg-row--mine' : 'sr-msg-row--theirs')}>
                    <div className={'sr-msg-bubble ' + (isMine ? 'sr-msg-bubble--mine' : 'sr-msg-bubble--theirs')}>
                        {!isMine && <span className="sr-msg-sender">{partner?.fullName?.split(' ')[0]}</span>}
                        {hasFile ? (
                            isImage(msg.fileUrl) ? (
                                <a href={API_URL + msg.fileUrl} target="_blank" rel="noreferrer" className="sr-msg-img-link">
                                    <img src={API_URL + msg.fileUrl} alt={msg.fileName || 'Image'} className="sr-msg-img" />
                                </a>
                            ) : (
                                <a href={API_URL + msg.fileUrl} download={msg.fileName} target="_blank" rel="noreferrer"
                                    className={'sr-msg-file ' + (isMine ? 'sr-msg-file--mine' : 'sr-msg-file--theirs')}>
                                    <span className="sr-msg-file-icon">📄</span>
                                    <div>
                                        <p className="sr-msg-file-name">{msg.fileName || 'File'}</p>
                                        <p className="sr-msg-file-hint">Tap to download</p>
                                    </div>
                                </a>
                            )
                        ) : (
                            <p className="sr-msg-text">{msg.content}</p>
                        )}
                        <span className="sr-msg-time">{time}</span>
                    </div>
                </div>
            )
        })

    /* ── Notes list ──────────────────────────────────────────────────────── */
    const notesList = (
        <>
            <div className="sr-notes-list">
                {notes.length === 0 ? (
                    <p className="sr-notes-empty">No notes yet. Add key points below.</p>
                ) : (
                    notes.map(function (note, i) {
                        return (
                            <div key={i} className="sr-note-item">
                                <p className="sr-note-text">{note.text}</p>
                                <span className="sr-note-time">{note.time}</span>
                            </div>
                        )
                    })
                )}
            </div>
            <div className="sr-notes-input-row">
                <input
                    type="text"
                    value={newNote}
                    onChange={function (e) { setNewNote(e.target.value) }}
                    onKeyDown={function (e) { if (e.key === 'Enter') addNote() }}
                    placeholder="Add a note..."
                    className="sr-input"
                    aria-label="Add a note"
                />
                <button onClick={addNote} className="sr-btn sr-btn--accent" aria-label="Save note">
                    Add
                </button>
            </div>
        </>
    )

    /* ── Control buttons ─────────────────────────────────────────────────── */
    const controls = (
        <div className="sr-controls" role="toolbar" aria-label="Session controls">
            <button
                onClick={toggleMute}
                className={'sr-ctrl-btn ' + (muted ? 'sr-ctrl-btn--danger' : '')}
                aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
                aria-pressed={muted}
                title={muted ? 'Unmute' : 'Mute'}
            >
                <span className="sr-ctrl-icon">{muted ? '🔇' : '🎤'}</span>
                <span className="sr-ctrl-label">{muted ? 'Unmute' : 'Mute'}</span>
            </button>
            <button
                onClick={toggleVideo}
                className={'sr-ctrl-btn ' + (videoOff ? 'sr-ctrl-btn--danger' : '')}
                aria-label={videoOff ? 'Start camera' : 'Stop camera'}
                aria-pressed={videoOff}
                title={videoOff ? 'Start Camera' : 'Stop Camera'}
            >
                <span className="sr-ctrl-icon">{videoOff ? '📷' : '📸'}</span>
                <span className="sr-ctrl-label">{videoOff ? 'Start Cam' : 'Stop Cam'}</span>
            </button>
            <button
                onClick={toggleScreenShare}
                className={'sr-ctrl-btn ' + (sharing ? 'sr-ctrl-btn--active' : '')}
                aria-label={sharing ? 'Stop screen sharing' : 'Share screen'}
                aria-pressed={sharing}
                title={sharing ? 'Stop Sharing' : 'Share Screen'}
            >
                <span className="sr-ctrl-icon">🖥️</span>
                <span className="sr-ctrl-label">{sharing ? 'Stop Share' : 'Share'}</span>
            </button>
            <button
                onClick={recording ? stopRecording : startRecording}
                className={'sr-ctrl-btn ' + (recording ? 'sr-ctrl-btn--recording' : '')}
                aria-label={recording ? 'Stop recording' : 'Start recording'}
                aria-pressed={recording}
                title={recording ? 'Stop Recording' : 'Record'}
            >
                <span className="sr-ctrl-icon">{recording ? '⏹️' : '⏺️'}</span>
                <span className="sr-ctrl-label">{recording ? 'Stop Rec' : 'Record'}</span>
            </button>
            <div className="sr-ctrl-divider" aria-hidden="true" />
            <button
                onClick={handleLeave}
                className="sr-ctrl-btn sr-ctrl-btn--leave"
                aria-label="Leave session"
                title="Leave Session"
            >
                <span className="sr-ctrl-icon">📵</span>
                <span className="sr-ctrl-label">Leave</span>
            </button>
        </div>
    )

    /* ── RENDER ──────────────────────────────────────────────────────────── */
    return (
        <div className="sr-root">

            {/* ── Header ── */}
            <header className="sr-header" role="banner">
                <div className="sr-header-left">
                    <Link
                        to="/sessions"
                        className="sr-back-btn"
                        aria-label="Leave and go back to sessions"
                        onClick={function (e) { e.preventDefault(); handleLeave() }}
                    >
                        ← Leave
                    </Link>
                    <div className="sr-session-info">
                        <p className="sr-session-title">{session?.title}</p>
                        <div className="sr-session-meta">
                            <span className="sr-partner-name">
                                with {partner?.fullName || 'Partner'}
                            </span>
                            <span className={'sr-role-badge ' + (isTeacher ? 'sr-role-badge--teaching' : 'sr-role-badge--learning')}>
                                {isTeacher ? 'Teaching' : 'Learning'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="sr-header-right">
                    <div className="sr-status" aria-live="polite" aria-label={'Call status: ' + statusCfg.label}>
                        <span className={'sr-status-dot ' + statusCfg.dot} />
                        <span className="sr-status-label">{statusCfg.label}</span>
                    </div>
                    <div className="sr-timer" aria-label={'Session duration: ' + formatElapsed(elapsed)}>
                        {formatElapsed(elapsed)}
                    </div>
                    {recording && (
                        <div className="sr-rec-badge" aria-label={'Recording: ' + formatRecTime(recordingTime)}>
                            <span className="sr-rec-dot" />
                            <span>REC {formatRecTime(recordingTime)}</span>
                        </div>
                    )}
                </div>
            </header>

            {/* ── Main ── */}
            <div className="sr-main">

                {/* ── Left column: video + controls + notes ── */}
                <div className="sr-left-col">

                    {/* Video stage */}
                    <div className="sr-stage" role="region" aria-label="Video area">

                        {/* Main video */}
                        {(sharing || peerSharing) ? (
                            <div className="sr-stage-main">
                                <video
                                    ref={screenVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className="sr-video sr-video--contain"
                                    aria-label="Screen share"
                                />
                                <div className="sr-presenting-badge">
                                    <span className="sr-presenting-dot" />
                                    {sharing ? 'You are presenting' : (partner?.fullName?.split(' ')[0] + ' is presenting')}
                                </div>
                            </div>
                        ) : (
                            <div className="sr-stage-main">
                                <video
                                    ref={remoteVideoRef}
                                    autoPlay
                                    playsInline
                                    className={'sr-video sr-video--cover' + (peerConnected && !peerVideoOff ? '' : ' sr-hidden')}
                                    aria-label={'Video from ' + (partner?.fullName || 'partner')}
                                />
                                {(!peerConnected || peerVideoOff) && (
                                    <div className="sr-stage-placeholder">
                                        <img
                                            src={getAvatarUrl(partner?.avatar, partner?.fullName)}
                                            alt={partner?.fullName || 'Partner'}
                                            className="sr-placeholder-avatar"
                                        />
                                        <p className="sr-placeholder-name">{partner?.fullName}</p>
                                        <p className="sr-placeholder-status">
                                            {!peerConnected ? 'Waiting for partner to join...' : 'Camera is off'}
                                        </p>
                                    </div>
                                )}
                                {peerConnected && peerMuted && (
                                    <div className="sr-peer-muted-badge" aria-label="Partner is muted">
                                        🔇 Muted
                                    </div>
                                )}
                                <div className="sr-peer-name-badge">
                                    {partner?.fullName?.split(' ')[0]}
                                </div>
                            </div>
                        )}

                        {/* PIP — local camera */}
                        <div className="sr-pip-stack">
                            {(sharing || peerSharing) && (
                                <div className="sr-pip" aria-label="Partner camera (PIP)">
                                    <video
                                        ref={remoteVideoRef}
                                        autoPlay
                                        playsInline
                                        className={'sr-pip-video' + (peerConnected && !peerVideoOff ? '' : ' sr-hidden')}
                                    />
                                    {(!peerConnected || peerVideoOff) && (
                                        <img
                                            src={getAvatarUrl(partner?.avatar, partner?.fullName)}
                                            alt={partner?.fullName || 'Partner'}
                                            className="sr-pip-avatar"
                                        />
                                    )}
                                    <span className="sr-pip-label">{partner?.fullName?.split(' ')[0]}</span>
                                    {peerMuted && <span className="sr-pip-muted">🔇</span>}
                                </div>
                            )}
                            <div className="sr-pip sr-pip--self" aria-label="Your camera (PIP)">
                                <video
                                    ref={localVideoRef}
                                    autoPlay
                                    playsInline
                                    muted
                                    className={'sr-pip-video sr-pip-video--mirror' + (videoOff ? ' sr-hidden' : '')}
                                />
                                {videoOff && (
                                    <div className="sr-pip-cam-off">
                                        <div className="sr-pip-initials">
                                            {currentUser?.fullName?.charAt(0) || 'Y'}
                                        </div>
                                    </div>
                                )}
                                <span className="sr-pip-label">You</span>
                                {muted && <span className="sr-pip-muted">🔇</span>}
                            </div>
                        </div>

                        {/* Media error toast */}
                        {mediaError && (
                            <div className="sr-media-error" role="alert" aria-live="assertive">
                                <span>⚠️</span>
                                <span>{mediaError}</span>
                                <button
                                    onClick={function () { setMediaError(null) }}
                                    className="sr-media-error-dismiss"
                                    aria-label="Dismiss error"
                                >×</button>
                            </div>
                        )}

                        {/* Session error toast */}
                        {error && session && (
                            <div className="sr-media-error" role="alert" aria-live="assertive">
                                <span>⚠️</span>
                                <span>{error}</span>
                                <button
                                    onClick={function () { setError(null) }}
                                    className="sr-media-error-dismiss"
                                    aria-label="Dismiss error"
                                >×</button>
                            </div>
                        )}
                    </div>

                    {/* Controls bar */}
                    {controls}

                </div>

                {/* ── Right column: chat — desktop only ── */}
                <aside className="sr-sidebar sr-sidebar--desktop" aria-label="Chat">
                    <div className="sr-panel-header">
                        <h3 className="sr-panel-title">💬 Chat</h3>
                        <span className="sr-chat-count">{messages.length}</span>
                    </div>
                    <div className="sr-chat-messages" role="log" aria-live="polite" aria-label="Chat messages">
                        {messageList}
                        <div ref={chatEndRef} />
                    </div>
                    <div className="sr-chat-footer">
                        <div className="sr-chat-input-row">
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                                className="sr-file-input-hidden"
                                onChange={handleFileSelect}
                                aria-label="Attach file"
                            />
                            <button
                                onClick={function () { fileInputRef.current?.click() }}
                                disabled={uploadingFile}
                                className="sr-icon-btn"
                                aria-label="Attach file or image"
                                title="Attach file"
                            >
                                {uploadingFile ? <Spinner size="sm" /> : '📎'}
                            </button>
                            <input
                                type="text"
                                value={newMessage}
                                onChange={function (e) { setNewMessage(e.target.value) }}
                                onKeyDown={handleKey}
                                placeholder="Type a message..."
                                className="sr-input sr-chat-text-input"
                                aria-label="Chat message"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!newMessage.trim()}
                                className={'sr-icon-btn sr-icon-btn--send' + (newMessage.trim() ? ' sr-icon-btn--send-active' : '')}
                                aria-label="Send message"
                                title="Send"
                            >
                                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                    <path d="M14 8L2 2L5 8L2 14L14 8Z" fill="currentColor" />
                                </svg>
                            </button>
                        </div>
                        <p className="sr-chat-hint">
                            Images · PDF · Word · Excel · PPT · ZIP · Max 10 MB
                        </p>
                    </div>
                    {/* Notes — desktop only, inside sidebar below chat */}
                    <div className="sr-notes-panel sr-notes-panel--desktop" aria-label="Session notes">
                        <div className="sr-panel-header">
                            <h3 className="sr-panel-title">📝 Session Notes</h3>
                        </div>
                        <div className="sr-notes-body">
                            {notesList}
                        </div>
                    </div>
                </aside>
            </div>

            {/* ── Mobile bottom panel ── */}
            <div className="sr-mobile-panel" aria-label="Chat and notes">
                <div className="sr-tab-bar" role="tablist">
                    {[{ id: 'chat', label: '💬 Chat' }, { id: 'notes', label: '📝 Notes' }].map(function (tab) {
                        const active = mobileTab === tab.id
                        return (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={active}
                                onClick={function () { setMobileTab(tab.id) }}
                                className={'sr-tab-btn' + (active ? ' sr-tab-btn--active' : '')}
                            >
                                {tab.label}
                            </button>
                        )
                    })}
                </div>

                {mobileTab === 'chat' ? (
                    <div className="sr-tab-panel" role="tabpanel" aria-label="Chat">
                        <div className="sr-chat-messages sr-chat-messages--mobile" role="log" aria-live="polite">
                            {messageList}
                            <div ref={chatEndRef} />
                        </div>
                        <div className="sr-chat-footer sr-chat-footer--mobile">
                            <div className="sr-chat-input-row">
                                <input
                                    type="text"
                                    value={newMessage}
                                    onChange={function (e) { setNewMessage(e.target.value) }}
                                    onKeyDown={handleKey}
                                    placeholder="Type a message..."
                                    className="sr-input sr-chat-text-input"
                                    aria-label="Chat message"
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={!newMessage.trim()}
                                    className={'sr-icon-btn sr-icon-btn--send' + (newMessage.trim() ? ' sr-icon-btn--send-active' : '')}
                                    aria-label="Send message"
                                >
                                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                                        <path d="M14 8L2 2L5 8L2 14L14 8Z" fill="currentColor" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="sr-tab-panel sr-tab-panel--notes" role="tabpanel" aria-label="Notes">
                        {notesList}
                    </div>
                )}
            </div>

        </div>
    )
}

export default SessionRoomPage