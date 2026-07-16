import { useTranslation } from 'react-i18next'

import GlowEffect from '@/shared/ui/GlowEffect'

import { formatNumber } from '../../rating.utils.js'
import seasonBg from './assets/season_bg.png'

import './RatingHero.css'

const RatingHero = ({ currentLanguage, isLoading, publicStats }) => {
    const { t } = useTranslation()

    return (
        <section className="rating-hero">
            <GlowEffect>
                <div className="rating-hero-main">
                    <span className="rating-eyebrow">PvP Blocks</span>

                    <div className="rating-hero-header">
                        <h1 className="glow-text">{t('rating.hero.title')}</h1>
                        <div className="rating-summary" aria-label={t('rating.hero.summaryAria')}>
                            <span>
                                <strong>{formatStat(publicStats?.activeUsers, currentLanguage, isLoading)}</strong>
                                {' '}
                                {t('rating.hero.playersOnline')}
                            </span>
                            <span>
                                <strong>{formatStat(publicStats?.matchesLast30Days, currentLanguage, isLoading)}</strong>
                                {' '}
                                {t('rating.hero.matchesPlayed')}
                            </span>
                        </div>
                    </div>
                    <p>{t('rating.hero.description')}</p>
                </div>
            </GlowEffect>

            <aside className="rating-season" style={{ backgroundImage: `url(${seasonBg})` }}>
                <strong>{formatStat(publicStats?.arenaRecord, currentLanguage, isLoading)}</strong>
                <span>{t('rating.hero.arenaRecord')}</span>
            </aside>
        </section>
    )
}

export default RatingHero

const formatStat = (value, language, isLoading) => (
    isLoading || value === null || value === undefined || !Number.isFinite(Number(value))
        ? '—'
        : formatNumber(Number(value), language)
)
