import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import GlowEffect from '@/shared/ui/GlowEffect'
import PlayerActionTrigger from '@/shared/ui/PlayerActionTrigger'

import { RatingAvatar, RankTierImage } from '../RatingPlayerMedia/RatingPlayerMedia.jsx'
import { sortOptionsMeta } from '../RatingControls/ratingControls.data.js'
import { formatNumber, getRankIcon, getSortLabel } from '../../rating.utils.js'

import './RatingBoard.css'

const RatingBoard = ({ currentLanguage, error, isLoading, players, sort }) => {
    const { t } = useTranslation()
    const sortOptions = useMemo(() => sortOptionsMeta.map((option) => ({
        ...option,
        label: t(`rating.sort.${option.key}`),
    })), [t])

    return (
        <section className="rating-board">
            <GlowEffect>
                <div className="glow-effect rating-board-inner">
                    <div className="rating-board-header">
                        <div>
                            <h2>{t('rating.board.title')}</h2>
                            <p>{t('rating.board.subtitle')} | {getSortLabel(sort, sortOptions, t)}</p>
                        </div>
                        <span>
                            <i className="fas fa-sync-alt"></i>
                            {t('rating.board.liveData')}
                        </span>
                    </div>

                    {isLoading ? (
                        <RatingState icon="fas fa-sync-alt" label={t('rating.board.loading')} />
                    ) : error ? (
                        <RatingState error icon="fas fa-exclamation-triangle" label={error} />
                    ) : players.length === 0 ? (
                        <RatingState icon="fas fa-database" label={t('rating.board.empty')} />
                    ) : (
                        <div className="rating-table-wrap">
                            <table className="rating-table">
                                <thead>
                                    <tr>
                                        <th>#</th>
                                        <th>{t('rating.board.headers.player')}</th>
                                        <th>{t('rating.board.headers.rating')}</th>
                                        <th>{t('rating.board.headers.wins')}</th>
                                        <th>{t('rating.board.headers.winRate')}</th>
                                        <th>{t('rating.board.headers.games')}</th>
                                        <th>{t('rating.board.headers.rank')}</th>
                                        <th>{t('rating.board.headers.soloRecord')}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {players.map((player) => (
                                        <tr key={player.id}>
                                            <td>
                                                <span className={`rating-rank rating-rank--${player.rank}`}>
                                                    {getRankIcon(player.rank)}
                                                </span>
                                            </td>
                                            <td>
                                                <PlayerActionTrigger asChild player={player}>
                                                    <div className="rating-player">
                                                        <RatingAvatar player={player} small />
                                                        <span>
                                                            <strong>{player.username}</strong>
                                                            <small>MMR {formatNumber(player.mmr, currentLanguage)}</small>
                                                        </span>
                                                    </div>
                                                </PlayerActionTrigger>
                                            </td>
                                            <td className="rating-value">{formatNumber(player.rating, currentLanguage)}</td>
                                            <td>{formatNumber(player.wins, currentLanguage)}</td>
                                            <td>{player.winRate}%</td>
                                            <td>{formatNumber(player.totalGames, currentLanguage)}</td>
                                            <td>
                                                <span className="rating-rank-tier">
                                                    <RankTierImage tier={player.rankTier} className="rating-rank-tier-image" />
                                                    {player.rankTier?.label || t('rating.rankFallback')}
                                                </span>
                                            </td>
                                            <td>{formatNumber(player.bestSoloScore, currentLanguage)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    <footer className="rating-update-info">
                        <i className="fas fa-shield-alt"></i>
                        {t('rating.board.footer')}
                    </footer>
                </div>
            </GlowEffect>
        </section>
    )
}

const RatingState = ({ error = false, icon, label }) => (
    <div className={`rating-state ${error ? 'rating-state--error' : ''}`}>
        <i className={icon}></i>
        {label}
    </div>
)

export default RatingBoard
