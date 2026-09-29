const COLORS = {
    primary: { bg: '#eff6ff', fg: '#2563eb' },
    success: { bg: '#ecfdf5', fg: '#059669' },
    warning: { bg: '#fffbeb', fg: '#d97706' },
    error:   { bg: '#fef2f2', fg: '#dc2626' },
    neutral: { bg: '#f1f5f9', fg: '#475569' },
    violet:  { bg: '#f5f3ff', fg: '#7c3aed' },
}

/**
 * Metric tile. `icon` is an icon component (e.g. from lucide-react).
 */
const StatCard = ({ icon: Icon, label, value, sub, color = 'primary' }) => {
    const c = COLORS[color] || COLORS.primary

    return (
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(15,23,42,0.04)', padding: '1.125rem 1.25rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', minWidth: 0 }}>
            <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '0.8125rem', fontWeight: 500, color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</p>
                <p style={{ fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2, margin: '0.375rem 0 0', letterSpacing: '-0.02em' }}>
                    {value}
                </p>
                {sub && (
                    <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '0.25rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</p>
                )}
            </div>
            {Icon && (
                <div style={{ width: 40, height: 40, borderRadius: 10, background: c.bg, color: c.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={20} strokeWidth={2} aria-hidden="true" />
                </div>
            )}
        </div>
    )
}

export default StatCard
