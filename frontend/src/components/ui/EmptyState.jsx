const EmptyState = ({ icon, title, message, action, actionLabel }) => {
    return (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                 style={{ background: 'var(--bg-elevated)' }}>
                <span className="text-2xl">{icon || '📭'}</span>
            </div>
            <h3 className="text-sm font-semibold text-slate-200 mb-1">
                {title || 'Nothing here yet'}
            </h3>
            <p className="text-sm text-slate-500 max-w-xs leading-relaxed">
                {message || 'Check back later.'}
            </p>
            {action && actionLabel && (
                <button onClick={action} className="btn-primary mt-5">
                    {actionLabel}
                </button>
            )}
        </div>
    )
}

export default EmptyState