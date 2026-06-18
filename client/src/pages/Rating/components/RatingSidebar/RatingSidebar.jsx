import { useTranslation } from 'react-i18next'

import { RatingAvatar, RankTierImage } from '../RatingPlayerMedia/RatingPlayerMedia.jsx'
import { formatNumber } from '../../rating.utils.js'
import { DEFAULT_COUNTRY_LABEL } from '../../ratingPage.config.js'
import PlayerActionTrigger from '@/shared/ui/PlayerActionTrigger'

import './RatingSidebar.css'

const RatingSidebar = ({ currentLanguage, player }) => {
    const { t } = useTranslation()

    return (
        <aside className="rating-sidebar" aria-label={t('rating.sidebar.ariaLabel')}>
            <LeaderPanel currentLanguage={currentLanguage} player={player} />
        </aside>
    )
}

const LeaderPanel = ({ player, currentLanguage }) => {
    const { t } = useTranslation()

    if (!player) {
        return (
            <div className="rating-leader-card rating-leader-card--empty">
                <h2>{t('rating.sidebar.emptyTitle')}</h2>
                <p>{t('rating.sidebar.emptyText')}</p>
            </div>
        )
    }

    return (
        <>
            <PlayerActionTrigger asChild player={player}>
                <div className="rating-leader-card">
                    <h2>{t('rating.sidebar.leaderTitle')}</h2>
                    <RatingAvatar player={player} />
                    <strong>{player.username} <span>{player.country || DEFAULT_COUNTRY_LABEL}</span></strong>
                    <span className="rating-tier-pill">
                        <RankTierImage tier={player.rankTier} className="rating-rank-tier-image rating-rank-tier-image--pill" />
                        {player.rankTier?.label || t('rating.rankFallback')}
                    </span>
                    <b>{formatNumber(player.rating, currentLanguage)} <small>MMR</small></b>
                </div>
            </PlayerActionTrigger>

            <div className="rating-leader-stats">
                <h2>{t('rating.sidebar.recordsTitle')}</h2>
                <LeaderStat label={t('rating.sidebar.maxMmr')} value={formatNumber(player.mmr, currentLanguage)} />
                <LeaderStat label={t('rating.sidebar.bestWins')} value={formatNumber(player.wins, currentLanguage)} />
                <LeaderStat label={t('rating.sidebar.bestWinRate')} value={`${player.winRate}%`} />
                <LeaderStat label={t('rating.sidebar.soloRecord')} value={formatNumber(player.bestSoloScore, currentLanguage)} />
            </div>
        </>
    )
}

const LeaderStat = ({ label, value }) => (
    <div className="rating-leader-stat">
        <span>{label}</span>
        <strong>{value}</strong>
    </div>
)

export default RatingSidebar
