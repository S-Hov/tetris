import { useTranslation } from 'react-i18next'

import GlowEffect from '@/shared/ui/GlowEffect'

import { formatNumber } from '../../rating.utils.js'
import seasonBg from './assets/season_bg.png'

import './RatingHero.css'

const RatingHero = ({ currentLanguage, playersCount, totalGames }) => {
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
                                <strong>{formatNumber(playersCount, currentLanguage)}</strong>
                                {' '}
                                {t('rating.hero.playersOnline')}
                            </span>
                            <span>
                                <strong>{formatNumber(totalGames, currentLanguage)}</strong>
                                {' '}
                                {t('rating.hero.matchesPlayed')}
                            </span>
                        </div>
                    </div>
                    <p>{t('rating.hero.description')}</p>
                </div>
            </GlowEffect>

            <aside className="rating-season" style={{ backgroundImage: `url(${seasonBg})` }}>
                <span>{t('rating.hero.season')}</span>
            </aside>
        </section>
    )
}

export default RatingHero
