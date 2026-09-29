/**
 * Small dependency-free SVG line chart for daily counts.
 *
 * series: [{ label, color, points: [{ date: 'YYYY-MM-DD', value }] }]
 * All series share the same dates. Scales to its container width.
 */
const W = 640, H = 220, PAD = { top: 16, right: 16, bottom: 28, left: 36 }

const niceMax = function(v) {
    if (v <= 4) return 4
    const pow = Math.pow(10, Math.floor(Math.log10(v)))
    const n = v / pow
    return (n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
}

const shortDate = function(iso) {
    return new Date(iso + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
}

const TrendChart = function({ title, series }) {
    const dates = series[0]?.points.map(function(p) { return p.date }) || []
    const max = niceMax(Math.max(0, ...series.flatMap(function(s) { return s.points.map(function(p) { return p.value }) })))
    const innerW = W - PAD.left - PAD.right
    const innerH = H - PAD.top - PAD.bottom
    const x = function(i) { return PAD.left + (dates.length <= 1 ? innerW / 2 : (i / (dates.length - 1)) * innerW) }
    const y = function(v) { return PAD.top + innerH - (v / max) * innerH }
    const ticks = [0, max / 2, max]
    const labelIdx = dates.length <= 1 ? [0] : [0, Math.floor((dates.length - 1) / 2), dates.length - 1]
    const totals = series.map(function(s) { return s.label + ': ' + s.points.reduce(function(a, p) { return a + p.value }, 0) }).join(', ')

    return (
        <figure className="admin-card trend-chart" style={{ margin: 0, padding: '1rem 1.25rem' }}>
            <figcaption style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                <strong style={{ fontSize: '0.9375rem', color: '#0f172a' }}>{title}</strong>
                <span style={{ display: 'flex', gap: '0.875rem', flexWrap: 'wrap' }}>
                    {series.map(function(s) {
                        return (
                            <span key={s.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: '#475569' }}>
                                <span aria-hidden="true" style={{ width: 10, height: 3, borderRadius: 2, background: s.color }} />{s.label}
                            </span>
                        )
                    })}
                </span>
            </figcaption>
            <svg viewBox={'0 0 ' + W + ' ' + H} width="100%" role="img" aria-label={title + ' — totals: ' + totals} style={{ display: 'block' }}>
                {ticks.map(function(t) {
                    return (
                        <g key={t}>
                            <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#eef2f7" />
                            <text x={PAD.left - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{Math.round(t)}</text>
                        </g>
                    )
                })}
                {labelIdx.map(function(i) {
                    return <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? 'start' : i === dates.length - 1 ? 'end' : 'middle'} fontSize="11" fill="#94a3b8">{dates[i] ? shortDate(dates[i]) : ''}</text>
                })}
                {series.map(function(s) {
                    const d = s.points.map(function(p, i) { return (i === 0 ? 'M' : 'L') + x(i).toFixed(1) + ' ' + y(p.value).toFixed(1) }).join(' ')
                    return (
                        <g key={s.label}>
                            <path d={d} fill="none" stroke={s.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                            {s.points.length <= 31 && s.points.map(function(p, i) {
                                return <circle key={i} cx={x(i)} cy={y(p.value)} r={p.value > 0 ? 2.5 : 0} fill={s.color}><title>{shortDate(p.date) + ': ' + p.value + ' ' + s.label.toLowerCase()}</title></circle>
                            })}
                        </g>
                    )
                })}
            </svg>
        </figure>
    )
}

export default TrendChart
