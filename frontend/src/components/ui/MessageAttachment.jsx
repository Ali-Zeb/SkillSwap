const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

const isImageUrl = (url) => {
    if (!url) return false
    return /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(url)
}

// Chat file attachments live on Cloudinary (absolute URL in fileUrl). Older
// messages sent before that migration may still have a relative '/uploads/...'
// path pointing at the backend's local disk — keep those working by prefixing
// SOCKET_URL (the server's root origin, matching where server.js mounts
// express.static('/uploads', ...)) only when the URL isn't already absolute.
const resolveFileUrl = (url) => {
    if (!url) return url
    if (/^https?:\/\//i.test(url)) return url
    return SOCKET_URL + url
}

/**
 * Renders a message's file attachment as either an inline image preview or
 * a download chip — shared by SessionRoomPage's chat panel (variant="dark",
 * uses the existing sr-msg-* CSS classes) and MessagesPage's chat
 * (variant="light", inline styles matching its existing bubble look), so
 * the attachment logic and markup live in one place instead of being
 * duplicated per page.
 */
const MessageAttachment = ({ fileUrl, fileName, mine = false, variant = 'light' }) => {
    const url = resolveFileUrl(fileUrl)
    const isImage = isImageUrl(fileUrl)

    if (variant === 'dark') {
        return isImage ? (
            <a href={url} target="_blank" rel="noreferrer" className="sr-msg-img-link">
                <img src={url} alt={fileName || 'Image'} className="sr-msg-img" />
            </a>
        ) : (
            <a
                href={url}
                download={fileName}
                target="_blank"
                rel="noreferrer"
                className={'sr-msg-file ' + (mine ? 'sr-msg-file--mine' : 'sr-msg-file--theirs')}
            >
                <span className="sr-msg-file-icon">📄</span>
                <div>
                    <p className="sr-msg-file-name">{fileName || 'File'}</p>
                    <p className="sr-msg-file-hint">Tap to download</p>
                </div>
            </a>
        )
    }

    return isImage ? (
        <a href={url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
            <img
                src={url}
                alt={fileName || 'Image'}
                style={{ maxWidth: 220, maxHeight: 220, borderRadius: 8, objectFit: 'cover', display: 'block' }}
            />
        </a>
    ) : (
        <a
            href={url}
            download={fileName}
            target="_blank"
            rel="noreferrer"
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0.5rem 0.75rem',
                borderRadius: 8,
                textDecoration: 'none',
                background: mine ? 'rgba(255,255,255,0.18)' : '#e2e8f0',
            }}
        >
            <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>📄</span>
            <div>
                <p style={{ color: mine ? 'white' : 'var(--dark)', fontSize: '0.8125rem', fontWeight: 600, margin: 0 }}>
                    {fileName || 'File'}
                </p>
                <p style={{ color: mine ? 'rgba(255,255,255,0.75)' : 'var(--gray)', fontSize: '0.6875rem', margin: '2px 0 0' }}>
                    Tap to download
                </p>
            </div>
        </a>
    )
}

export default MessageAttachment
