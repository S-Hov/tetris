import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { getLocalizedGamePath } from '@/i18n'
import useMediaQuery from '@/shared/hooks/useMediaQuery'
import usePublicStats from '@/shared/hooks/usePublicStats'
import { arenaStatsMeta } from './homeHero.data.js'

import bannerBackground from './assets/bunner_bg.png'

import './HomeHero.css'

const SandHeroAnimation = lazy(() => import('./SandHeroAnimation.jsx'))

const HomeHero = () => {
    const { t, i18n } = useTranslation()
    const shouldRenderSandHero = useMediaQuery('(min-width: 1281px)')
    const { data: publicStats, isLoading } = usePublicStats()
    const arenaStats = arenaStatsMeta.map((stat) => ({
        ...stat,
        value: formatStatValue(publicStats?.[stat.key], i18n.language, isLoading),
        label: t(`home.arena.stats.${stat.key}`),
    }))

    return (
        <section className="home-hero" style={{ '--home-hero-bg': `url(${bannerBackground})` }}>
            <div>
                <section className="home-arena-panel" aria-label={t('home.arena.ariaLabel')}>
                    {arenaStats.map((stat) => (
                        <div className="home-arena-panel__item" key={stat.key}>
                            <span className="home-arena-panel__icon">
                                <i className={stat.icon}></i>
                            </span>
                            <span>
                                <strong>{stat.value}</strong>
                                <small>{stat.label}</small>
                            </span>
                        </div>
                    ))}
                </section>

                <div className="home-hero__content">
                    <h1>
                        {t('home.hero.titleLine')}<br />
                        <span className="glow-text">{t('home.hero.titleHighlight')}</span>
                    </h1>
                    <p>{t('home.hero.subtitle')}</p>

                    <div className="home-hero__actions">
                        <Link to={getLocalizedGamePath('/game/solo/casual')} className="home-primary-button">
                            <i className="fas fa-play"></i>
                            {t('home.hero.playButton')}
                        </Link>
                        <Link to="/rating" className="home-secondary-button button btn-hover-shine">
                            <i className="fas fa-crown"></i>
                            {t('home.hero.ratingButton')}
                        </Link>
                    </div>
                </div>
            </div>

            {shouldRenderSandHero ? (
                <div className="home-hero__preview" aria-label={t('home.hero.previewAriaLabel')}>
                    <Suspense fallback={null}>
                        <SandHeroAnimation />
                    </Suspense>
                </div>
            ) : null}
        </section>
    )
}

export default HomeHero

const formatStatValue = (value, language, isLoading) => {
    if (isLoading || value === null || value === undefined || !Number.isFinite(Number(value))) {
        return '—'
    }

    return new Intl.NumberFormat(language).format(Number(value))
}
