/**
 * Previous / Next pager for the admin tables.
 * pagination: { page, pages, total } as returned by the /api/admin list endpoints.
 */
const Pagination = function({ pagination, onPageChange, disabled }) {
    if (!pagination || pagination.pages <= 1) return null
    const { page, pages, total } = pagination

    const btn = function(isDisabled) {
        return {
            padding: '0.5rem 0.875rem', borderRadius: 8, border: '1.5px solid #e2e8f0', background: 'white',
            color: isDisabled ? '#cbd5e1' : '#1e293b', fontWeight: 500, fontSize: '0.875rem',
            cursor: isDisabled ? 'default' : 'pointer'
        }
    }

    return (
        <nav aria-label="Pagination" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginTop: '1rem', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
                Page {page} of {pages} · {total} total
            </span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="button" disabled={disabled || page <= 1} onClick={function() { onPageChange(page - 1) }} style={btn(disabled || page <= 1)}>
                    ← Previous
                </button>
                <button type="button" disabled={disabled || page >= pages} onClick={function() { onPageChange(page + 1) }} style={btn(disabled || page >= pages)}>
                    Next →
                </button>
            </div>
        </nav>
    )
}

export default Pagination
