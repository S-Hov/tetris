import { useTranslation } from 'react-i18next'

import GlowEffect from '@/shared/ui/GlowEffect'

import { projectStatsMeta } from './aboutStats.data.js'

import './AboutStats.css'

const AboutStats = () => {
    const { t } = useTranslation()
    const projectStats = projectStatsMeta.map((stat) => ({
        ...stat,
        label: t(`about.stats.items.${stat.key}`),
    }))

    return (
        <section className="about-block" aria-labelledby="about-stats-title">
            <h2 className="about-block__title" id="about-stats-title">{t('about.stats.title')}</h2>
            <div className="about-stats">
                {projectStats.map((stat) => (
                    <article className="about-stat-card" key={stat.label}>
                        <GlowEffect>
                            <div className="glow-effect about-stat-card__inner">
                                <i className={stat.icon}></i>
                                <strong>{stat.value}</strong>
                                <span>{stat.label}</span>
                            </div>
                        </GlowEffect>
                    </article>
                ))}
            </div>
        </section>
    )
}

export default AboutStats
