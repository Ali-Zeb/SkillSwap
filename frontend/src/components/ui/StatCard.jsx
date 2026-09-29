const COLORS = {
    primary: { bg: '#eff6ff', fg: '#2563eb' },
    success: { bg: '#f0fdf4', fg: '#16a34a' },
    warning: { bg: '#fffbeb', fg: '#d97706' },
    error:   { bg: '#fef2f2', fg: '#dc2626' },
    neutral: { bg: '#f1f5f9', fg: '#475569' },
}

const StatCard = ({ icon, label, value, sub, color = 'primary' }) => {
    const c = COLORS[color] || COLORS.primary

    return (
        <div style={{ background: 'white', borderRadius: 12, padding: '1.125rem 1.25rem', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: c.bg, color: c.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0 }}>
                {icon}
            </div>
            <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', lineHeight: 1.2, margin: 0 }}>
                    {value}
                </p>
                <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
                {sub && (
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</p>
                )}
            </div>
        </div>
    )
}

export default StatCard
