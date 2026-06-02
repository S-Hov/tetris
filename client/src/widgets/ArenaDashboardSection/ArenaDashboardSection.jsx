import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import GlowEffect from '@/shared/ui/GlowEffect'
import { leaderboardAPI } from '@/shared/api/leaderboard'
import { useAuth } from '@/shared/hooks/useAuth'

import { rankImages } from './homeDashboard.config.js'

import './ArenaDashboardSection.css'

const ArenaDashboardSection = ({ currentLanguage }) => {
    const { t } = useTranslation()
    const { isAuth, isLoading: isAuthLoading, user } = useAuth()
    const [topPlayers, setTopPlayers] = useState([])
    const [isTopLoading, setIsTopLoading] = useState(true)

    useEffect(() => {
        let ignore = false

        const loadTopPlayers = async () => {
            setIsTopLoading(true)

            try {
                const data = await leaderboardAPI.getList({ sort: 'rating', limit: 5 })

                if (!ignore) {
                    setTopPlayers(Array.isArray(data.players) ? data.players : [])
                }
            } catch {
                if (!ignore) {
                    setTopPlayers([])
                }
            } finally {
                if (!ignore) {
                    setIsTopLoading(false)
                }
            }
        }

        loadTopPlayers()

        return () => {
            ignore = true
        }
    }, [])

    const playerStats = useMemo(() => {
        const rankStats = user?.rankStats
        const rank = rankStats?.rank
        const totalMatches = Number(rankStats?.totalMatches) || 0
        const wins = Number(rankStats?.wins) || 0
        const rankPoints = Number(rankStats?.rankPoints) || 0
        const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0
        const rankMin = Number(rank?.min) || 0
        const rankMax = rank?.max === null || rank?.max === undefined ? null : Number(rank.max)
        const hasNextRank = rankMax !== null
        const progress = hasNextRank
            ? Math.max(0, Math.min(100, Math.round(((rankPoints - rankMin) / (rankMax + 1 - rankMin)) * 100)))
            : 100

        return {
            totalMatches,
            wins,
            winRate,
            rankPoints,
            rank,
            rankImage: getRankImage(rank),
            hasNextRank,
            progress,
            nextRankPoints: hasNextRank ? rankMax + 1 : null,
        }
    }, [user])

    return (
        <section className="home-dashboard" aria-label={t('home.dashboard.ariaLabel')}>
            <GlowEffect>
                <section className="home-leaders-panel">
                    <div className="home-panel-heading">
                        <h2>{t('home.dashboard.leadersTitle')}</h2>
                        <span>{t('home.dashboard.season')}</span>
                    </div>

                    {isTopLoading ? (
                        <div className="home-panel-state">
                            <i className="fas fa-sync-alt"></i>
                            {t('home.dashboard.loadingRating')}
                        </div>
                    ) : topPlayers.length === 0 ? (
                        <div className="home-panel-state">
                            <i className="fas fa-database"></i>
                            {t('home.dashboard.emptyRating')}
                        </div>
                    ) : (
                        <div className="home-leaders-list">
                            {topPlayers.map((player) => (
                                <Link to="/rating" className="home-leader-row" key={player.id}>
                                    <span className="home-leader-row__place">{player.rank}</span>
                                    <span className="home-leader-row__avatar">
                                        <PlayerAvatar player={player} />
                                    </span>
                                    <span className="home-leader-row__name">
                                        {player.username}
                                        {player.rank === 1 ? <i className="fas fa-crown"></i> : null}
                                    </span>
                                    <strong>{formatNumber(player.rating, currentLanguage)}</strong>
                                </Link>
                            ))}
                        </div>
                    )}

                    <Link to="/rating" className="button home-panel-button btn-hover-shine">
                        {t('home.dashboard.fullRatingButton')}
                    </Link>
                </section>
            </GlowEffect>

            <GlowEffect>
                <section className="home-player-stats-panel">
                    <div className="home-panel-heading">
                        <h2>{t('home.dashboard.statsTitle')}</h2>
                        <span>{t('home.dashboard.season')}</span>
                    </div>

                    {isAuthLoading ? (
                        <div className="home-panel-state home-panel-state--stats">
                            <i className="fas fa-sync-alt"></i>
                            {t('home.dashboard.loadingStats')}
                        </div>
                    ) : isAuth ? (
                        <div className="home-player-stats">
                            <div className="home-player-stats__values">
                                <StatRow label={t('home.dashboard.statWins')} value={formatNumber(playerStats.wins, currentLanguage)} />
                                <StatRow label={t('home.dashboard.statMatches')} value={formatNumber(playerStats.totalMatches, currentLanguage)} />
                                <StatRow label={t('home.dashboard.statWinRate')} value={`${playerStats.winRate}%`} />
                                <StatRow label={t('home.dashboard.statRank')} value={playerStats.rank?.label || t('home.dashboard.fallbackRank')} />
                            </div>

                            <div className="home-player-rank">
                                {playerStats.rankImage ? (
                                    <img src={playerStats.rankImage} alt={playerStats.rank?.label || 'rank'} />
                                ) : (
                                    <i className="fas fa-gem"></i>
                                )}
                            </div>

                            {playerStats.hasNextRank ? (
                                <div className="home-rank-progress">
                                    <div className="home-rank-progress__meta">
                                        <span>{formatNumber(playerStats.rankPoints, currentLanguage)} {t('home.dashboard.points')}</span>
                                        <span>{t('home.dashboard.pointsTo')} {formatNumber(playerStats.nextRankPoints, currentLanguage)}</span>
                                    </div>
                                    <div className="home-rank-progress__bar">
                                        <span style={{ width: `${playerStats.progress}%` }} />
                                    </div>
                                </div>
                            ) : (
                                <div className="home-rank-progress home-rank-progress--max">
                                    {t('home.dashboard.maxRank')}
                                </div>
                            )}

                            <Link to={`/${currentLanguage}/profile`} className="button home-panel-button home-panel-button--filled">
                                {t('home.dashboard.profileButton')}
                            </Link>
                        </div>
                    ) : (
                        <div className="home-player-stats home-player-stats--guest">
                            <div className="home-player-rank home-player-rank--empty">
                                <i className="fas fa-user-lock"></i>
                            </div>
                            <p>{t('home.dashboard.guestText')}</p>
                            <Link to="/register" className="button home-panel-button btn-hover-shine home-panel-button--filled">
                                {t('home.dashboard.registerButton')}
                            </Link>
                        </div>
                    )}
                </section>
            </GlowEffect>
        </section>
    )
}

const formatNumber = (value, language) => new Intl.NumberFormat(language === 'en' ? 'en-US' : 'ru-RU').format(Number(value) || 0)

const getAssetUrl = (value) => {
    if (!value) return ''
    if (/^https?:\/\//i.test(value)) return value

    const baseUrl = import.meta.env.VITE_API_URL || (
        typeof window !== 'undefined' && window.location.hostname
            ? `http://${window.location.hostname}:8880`
            : 'http://127.0.0.1:8880'
    )

    return `${baseUrl}${value}`
}

const getRankImage = (rank) => {
    const imageUrl = getAssetUrl(rank?.imageUrl)

    return imageUrl || rankImages[rank?.key] || rankImages.bronze
}

const PlayerAvatar = ({ player }) => {
    const avatarUrl = getAssetUrl(player.avatarUrl)

    if (!avatarUrl) {
        return player.avatar
    }

    if (/\.(webm|mp4|mov|ogg|ogv|m4v)(?:[?#]|$)/i.test(avatarUrl)) {
        return <video src={avatarUrl} autoPlay loop muted playsInline aria-label={player.username || 'avatar'} />
    }

    return <img src={avatarUrl} alt={player.username || 'avatar'} />
}

const StatRow = ({ label, value }) => (
    <div className="home-player-stats__row">
        <span>{label}</span>
        <strong>{value}</strong>
    </div>
)

export default ArenaDashboardSection
