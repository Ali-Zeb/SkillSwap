/**
 * Shown only when printing / "Save as PDF": logo, report title, date range
 * and generation time. Hidden on screen.
 */
const PrintHeader = function({ title, subtitle, generatedAt }) {
    return (
        <div className="print-only print-header">
            <div className="print-brand">
                <span className="print-brand-mark">S</span>
                <span>SkillSwap</span>
            </div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
            {generatedAt && <p>Generated {new Date(generatedAt).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })}</p>}
        </div>
    )
}

export default PrintHeader
