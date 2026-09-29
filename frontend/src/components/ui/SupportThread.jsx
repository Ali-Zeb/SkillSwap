import { formatDateTime } from '../../utils/helpers'

/**
 * Chat-style support conversation. `viewer` is 'user' or 'admin' and
 * decides which side of the thread is "me".
 */
const SupportThread = function({ messages, viewer, userName }) {
    return (
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {messages.map(function(m, i) {
                const mine   = m.sender === viewer
                const author = m.sender === 'admin'
                    ? (viewer === 'admin' && m.senderId?.fullName ? m.senderId.fullName + ' (support)' : 'SkillSwap Support')
                    : (userName || 'User')
                return (
                    <li key={m._id || i} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: 'min(640px, 88%)', background: m.sender === 'admin' ? '#eff6ff' : '#ffffff', border: '1px solid ' + (m.sender === 'admin' ? '#bfdbfe' : '#e2e8f0'), borderRadius: 12, padding: '0.75rem 1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: 4, flexWrap: 'wrap' }}>
                                <strong style={{ fontSize: '0.8125rem', color: m.sender === 'admin' ? '#1d4ed8' : '#1e293b' }}>{author}</strong>
                                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{formatDateTime(m.createdAt)}</span>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.6 }}>{m.body}</p>
                        </div>
                    </li>
                )
            })}
        </ol>
    )
}

export default SupportThread
