import { useTranslation } from 'react-i18next'

import { RatingAvatar, RankTierImage } from '../RatingPlayerMedia/RatingPlayerMedia.jsx'
import { formatNumber } from '../../rating.utils.js'
import { DEFAULT_COUNTRY_LABEL } from '../../ratingPage.config.js'
import { podiumConfig } from './ratingPodium.config.js'
import PlayerActionTrigger from '@/shared/ui/PlayerActionTrigger'

import './RatingPodium.css'

const RatingPodium = ({ currentLanguage, players }) => {
    const { t } = useTranslation()

    if (players.length === 0) {
        return null
    }

    return (
        <section className="rating-podium" aria-label={t('rating.podium.ariaLabel')}>
            {players.map((player) => (
                <PodiumCard
                    currentLanguage={currentLanguage}
                    key={player.id}
                    player={player}
                />
            ))}
        </section>
    )
}

const PodiumCard = ({ player, currentLanguage }) => {
    const { t } = useTranslation()
    const config = podiumConfig[player.rank] || podiumConfig[3]

    return (
        <PlayerActionTrigger asChild player={player}>
            <article
                className={`rating-podium-card rating-podium-card--rank-${player.rank} rating-podium-card--${config.accent}`}
                style={{ backgroundImage: `url(${config.bg})` }}
            >
                <RatingAvatar player={player} />
                <h2>{player.username}</h2>
                <span className="rating-player-country">{player.country || DEFAULT_COUNTRY_LABEL}</span>
                <span className="rating-tier-pill">
                    <RankTierImage tier={player.rankTier} className="rating-rank-tier-image rating-rank-tier-image--pill" />
                    {player.rankTier?.label || t('rating.rankFallback')}
                </span>
                <strong>{formatNumber(player.rating, currentLanguage)} <small>MMR</small></strong>
                <div className="rating-podium-stats">
                    <span>
                        <small>{t('rating.sort.winRate')}</small>
                        {player.winRate}%
                    </span>
                    <span>
                        <small>{t('rating.podium.wins')}</small>
                        {formatNumber(player.wins, currentLanguage)}
                    </span>
                    <span>
                        <small>{t('rating.podium.games')}</small>
                        {formatNumber(player.totalGames, currentLanguage)}
                    </span>
                </div>
            </article>
        </PlayerActionTrigger>
    )
}

export default RatingPodium
