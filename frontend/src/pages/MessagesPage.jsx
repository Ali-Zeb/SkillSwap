import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { io } from 'socket.io-client'
import { selectCurrentUser, selectToken } from '../features/auth/authSlice'
import api from '../api/axios'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/ui/EmptyState'
import { getAvatarUrl, timeAgo, truncate } from '../utils/helpers'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

const MessagesPage = function() {
    const { userId }   = useParams()
    const navigate     = useNavigate()
    const currentUser  = useSelector(selectCurrentUser)
    const token        = useSelector(selectToken)

    const [conversations, setConversations] = useState([])
    const [active,        setActive]        = useState(null)
    const [messages,      setMessages]      = useState([])
    const [text,          setText]          = useState('')
    const [sending,       setSending]       = useState(false)
    const [loadingConvos, setLoadingConvos] = useState(true)
    const [loadingMsgs,   setLoadingMsgs]   = useState(false)
    const [typing,        setTyping]        = useState({})
    // On mobile: which panel is visible — 'sidebar' or 'chat'
    const [mobileView,    setMobileView]    = useState('sidebar')

    const socketRef = useRef(null)
    const bottomRef = useRef(null)
    const timerRef  = useRef(null)

    useEffect(function() {
        if (!token) return
        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
        })
        socketRef.current = socket
        socket.on('new-message', function(msg) {
            setMessages(function(prev) {
                if (prev.some(function(m) { return m._id === msg._id })) return prev
                return [...prev, msg]
            })
            setConversations(function(prev) {
                return prev.map(function(c) {
                    if (c.user?._id === msg.senderId || c.user?._id === msg.receiverId) {
                        return { ...c, lastMessage: msg }
                    }
                    return c
                })
            })
        })
        socket.on('user-typing', function(data) {
            setTyping(function(prev) { return { ...prev, [data.userId]: data.isTyping } })
        })
        return function() {
            socket.disconnect()
            socketRef.current = null
        }
    }, [token])

    useEffect(function() {
        api.get('/messages')
            .then(function(res) { setConversations(res.data.conversations || []) })
            .catch(function() { setConversations([]) })
            .finally(function() { setLoadingConvos(false) })
    }, [])

    useEffect(function() {
        if (!userId || loadingConvos) return
        const found = conversations.find(function(c) { return c.user?._id === userId })
        if (found) {
            openChat(found.user)
        } else {
            api.get('/users/profile/' + userId)
                .then(function(res) { openChat(res.data.user) })
                .catch(function() { navigate('/messages') })
        }
    }, [userId, loadingConvos])

    const openChat = async function(user) {
        setActive(user)
        setMobileView('chat') // switch to chat panel on mobile
        setLoadingMsgs(true)
        setMessages([])
        try {
            const { data } = await api.get('/messages/' + user._id)
            setMessages(data.messages || [])
        } catch {
            setMessages([])
        } finally {
            setLoadingMsgs(false)
        }
    }

    useEffect(function() {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const sendMessage = async function() {
        if (!text.trim() || !active) return
        const content = text.trim()
        setText('')
        setSending(true)
        const temp = {
            _id: 'temp_' + Date.now(),
            senderId: currentUser._id,
            receiverId: active._id,
            content,
            createdAt: new Date().toISOString(),
            isOptimistic: true,
        }
        setMessages(function(prev) { return [...prev, temp] })
        try {
            if (socketRef.current?.connected) {
                socketRef.current.emit('send-message', { receiverId: active._id, content })
            } else {
                await api.post('/messages', { receiverId: active._id, content })
            }
        } catch {
            setMessages(function(prev) { return prev.filter(function(m) { return m._id !== temp._id }) })
            setText(content)
        } finally {
            setSending(false)
        }
    }

    const handleInput = function(e) {
        setText(e.target.value)
        if (socketRef.current?.connected && active) {
            socketRef.current.emit('typing', { receiverId: active._id, isTyping: true })
            clearTimeout(timerRef.current)
            timerRef.current = setTimeout(function() {
                socketRef.current?.emit('typing', { receiverId: active._id, isTyping: false })
            }, 1500)
        }
    }

    const handleKey = function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    const partnerTyping = active && typing[active._id]

    const renderSidebar = function() {
        if (loadingConvos) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
                    <Spinner size="md" />
                </div>
            )
        }
        if (conversations.length === 0) {
            return (
                <div style={{ padding: '1rem' }}>
                    <EmptyState
                        icon="💬"
                        title="No conversations yet"
                        message="Connect with matches to start chatting."
                    />
                </div>
            )
        }
        return (
            <div>
                {conversations.map(function(convo) {
                    const isActiveCon = active?._id === convo.user?._id
                    const last        = convo.lastMessage
                    return (
                        <button
                            key={convo.user?._id}
                            onClick={() => openChat(convo.user)}
                            style={{
                                width: '100%',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.875rem 1rem',
                                background: isActiveCon ? '#eff6ff' : 'transparent',
                                border: 'none',
                                borderBottom: '1px solid #f1f5f9',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'background 0.15s',
                            }}
                        >
                            <div style={{ position: 'relative', flexShrink: 0 }}>
                                <img
                                    src={getAvatarUrl(convo.user?.avatar, convo.user?.fullName)}
                                    alt={convo.user?.fullName}
                                    style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', background: '#e2e8f0', border: '2px solid #f1f5f9', display: 'block' }}
                                />
                                {convo.unreadCount > 0 ? (
                                    <span style={{ position: 'absolute', top: -2, right: -2, width: 18, height: 18, background: 'var(--primary)', borderRadius: '50%', fontSize: '0.6875rem', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, border: '2px solid white' }}>
                                        {convo.unreadCount}
                                    </span>
                                ) : null}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, marginBottom: 2 }}>
                                    <p style={{ fontWeight: 600, fontSize: '0.9rem', color: isActiveCon ? '#2563eb' : 'var(--dark)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {convo.user?.fullName}
                                    </p>
                                    {last ? (
                                        <span style={{ fontSize: '0.6875rem', color: 'var(--gray)', flexShrink: 0 }}>
                                            {timeAgo(last.createdAt)}
                                        </span>
                                    ) : null}
                                </div>
                                {last ? (
                                    <p style={{ fontSize: '0.8125rem', color: 'var(--gray)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {last.senderId === currentUser?._id ? 'You: ' : ''}
                                        {truncate(last.content, 38)}
                                    </p>
                                ) : null}
                            </div>
                        </button>
                    )
                })}
            </div>
        )
    }

    const renderMessages = function() {
        if (loadingMsgs) {
            return (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem' }}>
                    <Spinner size="md" />
                </div>
            )
        }
        if (messages.length === 0) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '2rem' }}>
                    <div style={{ width: 56, height: 56, background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: '1rem' }}>💬</div>
                    <p style={{ fontWeight: 600, color: 'var(--dark)', fontSize: '1rem', marginBottom: 4 }}>Start the conversation</p>
                    <p style={{ color: 'var(--gray)', fontSize: '0.875rem' }}>{'Say hello to ' + active?.fullName}</p>
                </div>
            )
        }
        return (
            <div style={{ padding: '1rem' }}>
                {messages.map(function(msg, idx) {
                    const mine     = msg.senderId === currentUser?._id || msg.senderId?._id === currentUser?._id
                    const prev     = messages[idx - 1]
                    const showTime = idx === 0 || new Date(msg.createdAt).getTime() - new Date(prev.createdAt).getTime() > 300000
                    return (
                        <div key={msg._id} style={{ marginBottom: '0.625rem' }}>
                            {showTime ? (
                                <div style={{ display: 'flex', justifyContent: 'center', margin: '0.75rem 0' }}>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--gray)', background: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: 20 }}>
                                        {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            ) : null}
                            <div style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                                <div style={{
                                    maxWidth: '72%',
                                    padding: '0.5625rem 0.875rem',
                                    borderRadius: mine ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
                                    background: mine ? 'var(--primary)' : '#f1f5f9',
                                    color: mine ? 'white' : 'var(--dark)',
                                    fontSize: '0.9rem',
                                    lineHeight: 1.5,
                                    opacity: msg.isOptimistic ? 0.7 : 1,
                                    boxShadow: mine ? '0 1px 4px rgba(37,99,235,0.2)' : '0 1px 3px rgba(0,0,0,0.06)',
                                    wordBreak: 'break-word',
                                }}>
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div ref={bottomRef} />
            </div>
        )
    }

    const renderChat = function() {
        if (!active) {
            return (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', padding: '2rem', background: '#f8fafc' }}>
                    <div style={{ width: 72, height: 72, background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', marginBottom: '1.25rem' }}>💬</div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.5rem' }}>Your Messages</h3>
                    <p style={{ fontSize: '0.9rem', color: 'var(--gray)', maxWidth: 280, lineHeight: 1.6 }}>
                        Select a conversation from the left or connect with a match to start chatting.
                    </p>
                </div>
            )
        }
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Chat header - Task 1: polished mobile layout */}
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '0.625rem', background: 'white', flexShrink: 0, minHeight: 60 }}>
                    {/* Back arrow - shown on mobile via CSS .messages-back-btn */}
                    <button
                        onClick={function() { setMobileView('sidebar') }}
                        className="messages-back-btn"
                        style={{ display: 'none', background: 'none', border: 'none', color: 'var(--primary)', fontWeight: 700, cursor: 'pointer', fontSize: '1.125rem', padding: '0.25rem', lineHeight: 1, flexShrink: 0 }}
                        aria-label="Back to conversations"
                    >
                        &larr;
                    </button>
                    {/* Avatar */}
                    <img
                        src={getAvatarUrl(active.avatar, active.fullName)}
                        alt={active.fullName}
                        style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', background: '#e2e8f0', border: '2px solid #f1f5f9', flexShrink: 0, display: 'block' }}
                    />
                    {/* Name + headline — flex:1 + minWidth:0 lets text compress correctly */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, color: 'var(--dark)', fontSize: '0.9375rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3 }}>
                            {active.fullName}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: partnerTyping ? '#2563eb' : 'var(--gray)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.3, marginTop: 1, fontStyle: partnerTyping ? 'italic' : 'normal' }}>
                            {partnerTyping ? 'typing...' : (active.headline || 'SkillSwap member')}
                        </p>
                    </div>
                    {/* View Profile - compact on mobile via .msg-profile-btn */}
                    <button
                        onClick={function() { window.location.href = '/profile/' + active._id }}
                        className="msg-profile-btn"
                        style={{ padding: '0.375rem 0.75rem', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: '0.8125rem', fontWeight: 500, color: 'var(--primary)', background: 'white', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                    >
                        View Profile
                    </button>
                </div>
                {/* Messages */}
                <div style={{ flex: 1, overflowY: 'auto', background: 'white' }}>
                    {renderMessages()}
                </div>
                {/* Input */}
                <div style={{ padding: '0.875rem 1.25rem', borderTop: '1px solid #f1f5f9', background: 'white', flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'flex-end' }}>
                        <textarea
                            value={text}
                            onChange={handleInput}
                            onKeyDown={handleKey}
                            placeholder={'Message ' + active.fullName + '...'}
                            rows={1}
                            className="input"
                            style={{ flex: 1, resize: 'none', minHeight: 40, maxHeight: 120, padding: '0.5625rem 0.875rem', fontSize: '0.9rem' }}
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!text.trim() || sending}
                            style={{ width: 40, height: 40, background: text.trim() ? 'var(--primary)' : '#e2e8f0', color: text.trim() ? 'white' : 'var(--gray)', border: 'none', borderRadius: 8, cursor: text.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.2s' }}
                        >
                            {sending ? (
                                <Spinner size="sm" />
                            ) : (
                                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                                    <path d="M14 8L2 2L5 8L2 14L14 8Z" fill="currentColor"/>
                                </svg>
                            )}
                        </button>
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--gray)', marginTop: '0.375rem' }}>
                        Enter to send · Shift+Enter for new line
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div style={{ background: 'var(--background)', padding: '2rem 1.25rem', minHeight: 'calc(100vh - 64px)' }}>
            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                <div style={{ marginBottom: '1.25rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--dark)', marginBottom: '0.25rem' }}>Messages</h1>
                    <p style={{ color: 'var(--gray)', fontSize: '0.9375rem' }}>Chat with your skill exchange partners</p>
                </div>

                {/*
                  RESPONSIVE LAYOUT (Issue C3):
                  - Desktop/tablet (≥768px): side-by-side via .messages-layout class
                  - Mobile (<768px): only sidebar OR chat visible, toggled by mobileView state
                  CSS rules in index.css handle the layout switch via .messages-layout class.
                */}
                <div
                    className="messages-layout"
                    style={{ background: 'white', borderRadius: 15, boxShadow: '0 5px 20px rgba(0,0,0,0.05)', overflow: 'hidden', display: 'flex', height: 'calc(100vh - 220px)', minHeight: 480 }}
                >
                    {/* Sidebar */}
                    <div
                        className={`messages-sidebar${mobileView === 'chat' ? ' messages-sidebar-hidden' : ''}`}
                        style={{ width: 300, flexShrink: 0, borderRight: '1px solid #f1f5f9', display: 'flex', flexDirection: 'column' }}
                    >
                        <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
                            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--dark)' }}>Conversations</h2>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--gray)', marginTop: 2 }}>{conversations.length + ' total'}</p>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            {renderSidebar()}
                        </div>
                    </div>

                    {/* Chat area */}
                    <div
                        className={`messages-chat${mobileView === 'sidebar' ? ' messages-chat-hidden' : ''}`}
                        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}
                    >
                        {renderChat()}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default MessagesPage