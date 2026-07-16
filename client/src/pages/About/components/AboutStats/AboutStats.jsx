import { useTranslation } from 'react-i18next'

import GlowEffect from '@/shared/ui/GlowEffect'
import usePublicStats from '@/shared/hooks/usePublicStats'

import { projectStatsMeta } from './aboutStats.data.js'

import './AboutStats.css'

const AboutStats = () => {
    const { t, i18n } = useTranslation()
    const { data: publicStats, isLoading } = usePublicStats()
    const projectStats = projectStatsMeta.map((stat) => ({
        ...stat,
        value: stat.valueKey
            ? formatStatValue(publicStats?.[stat.valueKey], i18n.language, isLoading)
            : stat.value,
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

const formatStatValue = (value, language, isLoading) => (
    isLoading || value === null || value === undefined || !Number.isFinite(Number(value))
        ? '—'
        : new Intl.NumberFormat(language).format(Number(value))
)
