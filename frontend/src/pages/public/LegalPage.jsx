import PublicLayout from '../../components/layout/PublicLayout'
import usePageMeta from '../../hooks/usePageMeta'
import { privacy, terms } from '../../content/siteContent'

const formatLongDate = function(iso) {
    return new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/**
 * Renders a legal document (Privacy Policy / Terms of Service) from
 * content/siteContent.js.
 */
const LegalPage = function({ doc }) {
    const content = doc === 'terms' ? terms : privacy
    usePageMeta(content.title, content.metaDescription)

    return (
        <PublicLayout>
            <article className="public-section public-section--narrow public-legal">
                <h1 className="public-page-title">{content.title}</h1>
                <p className="public-updated">Last updated {formatLongDate(content.lastUpdated)}</p>
                <p className="public-text">{content.intro}</p>
                {content.sections.map(function(section) {
                    return (
                        <section key={section.heading}>
                            <h2>{section.heading}</h2>
                            {section.body.map(function(p, i) { return <p key={i} className="public-text">{p}</p> })}
                        </section>
                    )
                })}
            </article>
        </PublicLayout>
    )
}

export default LegalPage
