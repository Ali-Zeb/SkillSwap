const EmptyState = ({ icon, title, message, action, actionLabel }) => {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '2.5rem 1rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.875rem', fontSize: '1.5rem' }}>
                <span aria-hidden="true">{icon || '📭'}</span>
            </div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#1e293b', margin: '0 0 0.25rem' }}>
                {title || 'Nothing here yet'}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: 320, lineHeight: 1.6, margin: 0 }}>
                {message || 'Check back later.'}
            </p>
            {action && actionLabel && (
                <button type="button" onClick={action}
                    style={{ marginTop: '1.125rem', padding: '0.5625rem 1.125rem', borderRadius: 8, border: 'none', background: '#2563eb', color: 'white', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                    {actionLabel}
                </button>
            )}
        </div>
    )
}

export default EmptyState
