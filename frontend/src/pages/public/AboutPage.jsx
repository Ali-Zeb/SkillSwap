import { Link } from 'react-router-dom'
import PublicLayout from '../../components/layout/PublicLayout'
import usePageMeta from '../../hooks/usePageMeta'
import { about } from '../../content/siteContent'

const initials = function(name) {
    return name.split(/\s+/).map(function(p) { return p.replace(/[^A-Za-z؀-ۿ]/g, '').charAt(0) }).join('').slice(0, 2).toUpperCase()
}

const AboutPage = function() {
    usePageMeta('About', about.metaDescription)

    return (
        <PublicLayout>
            <section className="public-hero">
                <h1>{about.hero.title}</h1>
                <p>{about.hero.subtitle}</p>
                <div className="public-hero-actions">
                    <Link to="/register" className="public-cta public-cta--lg">Join SkillSwap</Link>
                    <a href="#how-it-works" className="public-secondary">How it works</a>
                </div>
            </section>

            <section className="public-section">
                <h2>{about.problem.title}</h2>
                {about.problem.paragraphs.map(function(p, i) { return <p key={i} className="public-text">{p}</p> })}
            </section>

            <section id="how-it-works" className="public-section">
                <h2>{about.howItWorks.title}</h2>
                <ol className="public-steps">
                    {about.howItWorks.steps.map(function(step, i) {
                        return (
                            <li key={step.title} className="public-step">
                                <span className="public-step-num" aria-hidden="true">{i + 1}</span>
                                <div>
                                    <h3>{step.title}</h3>
                                    <p>{step.text}</p>
                                </div>
                            </li>
                        )
                    })}
                </ol>
            </section>

            <section className="public-section">
                <h2>{about.team.title}</h2>
                <p className="public-text">{about.team.intro}</p>
                <ul className="public-team">
                    {about.team.members.map(function(m) {
                        return (
                            <li key={m.name} className="public-team-card">
                                <span className="public-team-avatar" aria-hidden="true">{initials(m.name)}</span>
                                <div>
                                    <strong>{m.name}</strong>
                                    <span>{m.role}</span>
                                </div>
                            </li>
                        )
                    })}
                </ul>
            </section>
        </PublicLayout>
    )
}

export default AboutPage
