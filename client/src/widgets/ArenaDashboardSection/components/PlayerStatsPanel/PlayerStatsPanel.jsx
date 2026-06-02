import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import GlowEffect from '@/shared/ui/GlowEffect'

import { formatNumber } from '../../arenaDashboard.utils.js'

import './PlayerStatsPanel.css'

const PlayerStatsPanel = ({ currentLanguage, isAuth, isLoading, playerStats }) => {
    const { t } = useTranslation()

    return (
        <GlowEffect>
            <section className="player-stats-panel">
                <div className="arena-panel-heading">
                    <h2>{t('home.dashboard.statsTitle')}</h2>
                    <span>{t('home.dashboard.season')}</span>
                </div>

                {isLoading ? (
                    <div className="arena-panel-state arena-panel-state--stats">
                        <i className="fas fa-sync-alt"></i>
                        {t('home.dashboard.loadingStats')}
                    </div>
                ) : isAuth ? (
                    <div className="player-stats">
                        <div className="player-stats__values">
                            <StatRow label={t('home.dashboard.statWins')} value={formatNumber(playerStats.wins, currentLanguage)} />
                            <StatRow label={t('home.dashboard.statMatches')} value={formatNumber(playerStats.totalMatches, currentLanguage)} />
                            <StatRow label={t('home.dashboard.statWinRate')} value={`${playerStats.winRate}%`} />
                            <StatRow label={t('home.dashboard.statRank')} value={playerStats.rank?.label || t('home.dashboard.fallbackRank')} />
                        </div>

                        <div className="player-stats__rank">
                            {playerStats.rankImage ? (
                                <img src={playerStats.rankImage} alt={playerStats.rank?.label || 'rank'} />
                            ) : (
                                <i className="fas fa-gem"></i>
                            )}
                        </div>

                        {playerStats.hasNextRank ? (
                            <div className="player-rank-progress">
                                <div className="player-rank-progress__meta">
                                    <span>{formatNumber(playerStats.rankPoints, currentLanguage)} {t('home.dashboard.points')}</span>
                                    <span>{t('home.dashboard.pointsTo')} {formatNumber(playerStats.nextRankPoints, currentLanguage)}</span>
                                </div>
                                <div className="player-rank-progress__bar">
                                    <span style={{ width: `${playerStats.progress}%` }} />
                                </div>
                            </div>
                        ) : (
                            <div className="player-rank-progress player-rank-progress--max">
                                {t('home.dashboard.maxRank')}
                            </div>
                        )}

                        <Link to={`/${currentLanguage}/profile`} className="button arena-panel-button arena-panel-button--filled">
                            {t('home.dashboard.profileButton')}
                        </Link>
                    </div>
                ) : (
                    <div className="player-stats player-stats--guest">
                        <div className="player-stats__rank player-stats__rank--empty">
                            <i className="fas fa-user-lock"></i>
                        </div>
                        <p>{t('home.dashboard.guestText')}</p>
                        <Link to="/register" className="button arena-panel-button btn-hover-shine arena-panel-button--filled">
                            {t('home.dashboard.registerButton')}
                        </Link>
                    </div>
                )}
            </section>
        </GlowEffect>
    )
}

const StatRow = ({ label, value }) => (
    <div className="player-stats__row">
        <span>{label}</span>
        <strong>{value}</strong>
    </div>
)

export default PlayerStatsPanel
