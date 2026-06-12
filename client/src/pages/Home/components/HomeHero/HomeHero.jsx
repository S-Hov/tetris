import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { getLocalizedGamePath } from '@/i18n'
import { arenaStatsMeta } from './homeHero.data.js'
import SandHeroAnimation from './SandHeroAnimation.jsx'

import bannerBackground from './assets/bunner_bg.png'

import './HomeHero.css'

const HomeHero = () => {
    const { t } = useTranslation()
    const arenaStats = arenaStatsMeta.map((stat) => ({
        ...stat,
        value: stat.valueKey ? t(`home.arena.stats.${stat.valueKey}`) : stat.value,
        label: stat.key === 'season' ? '' : t(`home.arena.stats.${stat.key}`),
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
                        <Link to={getLocalizedGamePath('/game/solo')} className="home-primary-button">
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

            <div className="home-hero__preview" aria-label={t('home.hero.previewAriaLabel')}>
                <SandHeroAnimation />
            </div>
        </section>
    )
}

export default HomeHero
