import { useEffect, useMemo, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/i18n'
import GlowEffect from '@/shared/ui/GlowEffect'
import { leaderboardAPI } from '@/shared/api/leaderboard'
import seasonBg from './assets/backgrounds/season_bg.png'
import goldBg from './assets/leaders_bg/gold.png'
import silverBg from './assets/leaders_bg/silver.png'
import bronzeBg from './assets/leaders_bg/bronze.png'
import './RatingPage.css'

const SITE_URL = 'https://www.pvp-tetris.online'

const sortOptionsMeta = [
    { key: 'rating', icon: 'fas fa-bolt' },
    { key: 'wins', icon: 'fas fa-trophy' },
    { key: 'winRate', icon: 'fas fa-percentage' },
    { key: 'games', icon: 'fas fa-gamepad' },
    { key: 'mmr', icon: 'fas fa-wave-square' },
    { key: 'bestSolo', icon: 'fas fa-star' },
]

const podiumConfig = {
    1: { bg: goldBg, accent: 'gold' },
    2: { bg: silverBg, accent: 'silver' },
    3: { bg: bronzeBg, accent: 'bronze' },
}

const RatingPage = () => {
    const { lang } = useParams()
    const { t, i18n } = useTranslation()
    const [sort, setSort] = useState('rating')
    const [players, setPlayers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const isSupportedLanguage = SUPPORTED_LANGUAGES.includes(lang)
    const currentLanguage = isSupportedLanguage ? lang : DEFAULT_LANGUAGE
    const sortOptions = useMemo(() => sortOptionsMeta.map((option) => ({
        ...option,
        label: t(`rating.sort.${option.key}`),
    })), [t])

    useEffect(() => {
        if (i18n.language !== currentLanguage) {
            i18n.changeLanguage(currentLanguage)
        }
    }, [currentLanguage, i18n])

    useEffect(() => {
        let ignore = false

        const loadLeaderboard = async () => {
            setIsLoading(true)
            setError('')

            try {
                const data = await leaderboardAPI.getList({ sort, limit: 50 })

                if (!ignore) {
                    setPlayers(Array.isArray(data.players) ? data.players : [])
                }
            } catch (requestError) {
                if (!ignore) {
                    setPlayers([])
                    setError(requestError?.message || t('rating.board.loadError'))
                }
            } finally {
                if (!ignore) {
                    setIsLoading(false)
                }
            }
        }

        loadLeaderboard()

        return () => {
            ignore = true
        }
    }, [sort, t])

    const topPlayers = useMemo(() => players.slice(0, 3), [players])
    const podiumPlayers = useMemo(() => {
        const byRank = new Map(topPlayers.map((player) => [player.rank, player]))

        return [byRank.get(2), byRank.get(1), byRank.get(3)].filter(Boolean)
    }, [topPlayers])
    const leader = topPlayers[0]
    const totalGames = useMemo(
        () => players.reduce((sum, player) => sum + Number(player.totalGames || 0), 0),
        [players]
    )

    if (!isSupportedLanguage) {
        return <Navigate to={`/${DEFAULT_LANGUAGE}/rating`} replace />
    }

    return (
        <section className="section rating-page">
            <Helmet htmlAttributes={{ lang: currentLanguage }}>
                <title>{t('rating.seo.title')}</title>
                <meta name="description" content={t('rating.seo.description')} />
                <link rel="canonical" href={`${SITE_URL}/${currentLanguage}/rating`} />
                <link rel="alternate" hrefLang="ru" href={`${SITE_URL}/ru/rating`} />
                <link rel="alternate" hrefLang="en" href={`${SITE_URL}/en/rating`} />
                <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/ru/rating`} />
            </Helmet>

            <div className="container rating-container">
                <section className="rating-hero">
                    <GlowEffect>
                        <div className="rating-hero-main">
                            <span className="rating-eyebrow">PvP Tetris</span>

                            <div className='rating-hero-header'>
                                <h1 className='glow-text'>{t('rating.hero.title')}</h1>
                                <div className="rating-summary" aria-label={t('rating.hero.summaryAria')}>
                                    <span>
                                        <strong>{formatNumber(players.length, currentLanguage)}</strong>
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

                <section className="rating-controls-card">
                    <GlowEffect>
                        <div className="glow-effect rating-controls">
                            <div className="rating-control-group" aria-label={t('rating.controls.systemAria')}>
                                <span className="rating-chip rating-chip--active">
                                    <i className="fas fa-trophy"></i>
                                    {t('rating.controls.season')}
                                </span>
                            </div>

                            <div className="rating-sort-panel" aria-label={t('rating.controls.sortAria')}>
                                <span>{t('rating.controls.sortLabel')}</span>
                                <div>
                                    {sortOptions.map((option) => (
                                        <button
                                            key={option.key}
                                            type="button"
                                            className={`rating-sort-button ${sort === option.key ? 'rating-sort-button--active' : ''}`}
                                            onClick={() => setSort(option.key)}
                                            title={option.label}
                                        >
                                            <i className={option.icon}></i>
                                            <span>{option.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </GlowEffect>
                </section>

                {podiumPlayers.length > 0 && (
                    <section className="rating-podium" aria-label={t('rating.podium.ariaLabel')}>
                        {podiumPlayers.map((player) => (
                            <PodiumCard key={player.id} player={player} currentLanguage={currentLanguage} />
                        ))}
                    </section>
                )}

                <div className="rating-content-grid">
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
                                    <div className="rating-state">
                                        <i className="fas fa-sync-alt"></i>
                                        {t('rating.board.loading')}
                                    </div>
                                ) : error ? (
                                    <div className="rating-state rating-state--error">
                                        <i className="fas fa-exclamation-triangle"></i>
                                        {error}
                                    </div>
                                ) : players.length === 0 ? (
                                    <div className="rating-state">
                                        <i className="fas fa-database"></i>
                                        {t('rating.board.empty')}
                                    </div>
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
                                                            <div className="rating-player">
                                                                <RatingAvatar player={player} small />
                                                                <span>
                                                                    <strong>{player.username}</strong>
                                                                    <small>MMR {formatNumber(player.mmr, currentLanguage)}</small>
                                                                </span>
                                                            </div>
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

                    <aside className="rating-sidebar" aria-label={t('rating.sidebar.ariaLabel')}>
                        <LeaderPanel player={leader} currentLanguage={currentLanguage} />
                    </aside>
                </div>
            </div>
        </section>
    )
}

const PodiumCard = ({ player, currentLanguage }) => {
    const { t } = useTranslation()
    const config = podiumConfig[player.rank] || podiumConfig[3]

    return (
        <article
            className={`rating-podium-card rating-podium-card--rank-${player.rank} rating-podium-card--${config.accent}`}
            style={{ backgroundImage: `url(${config.bg})` }}
        >
            {/* <span className="rating-podium-rank">{getRankIcon(player.rank)}</span> */}
            <RatingAvatar player={player} />
            <h2>{player.username}</h2>
            <span className="rating-player-country">🇷🇺</span>
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
            <div className="rating-leader-card">
                <h2>{t('rating.sidebar.leaderTitle')}</h2>
                <RatingAvatar player={player} />
                <strong>{player.username} <span>🇷🇺</span></strong>
                <span className="rating-tier-pill">
                    <RankTierImage tier={player.rankTier} className="rating-rank-tier-image rating-rank-tier-image--pill" />
                    {player.rankTier?.label || t('rating.rankFallback')}
                </span>
                <b>{formatNumber(player.rating, currentLanguage)} <small>MMR</small></b>
            </div>

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

const formatNumber = (value, lang = DEFAULT_LANGUAGE) => new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ru-RU').format(Number(value) || 0)

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

const renderAvatarMedia = (src, alt) => {
    if (/\.(webm|mp4|mov|ogg|ogv|m4v)(?:[?#]|$)/i.test(src)) {
        return <video src={src} autoPlay loop muted playsInline aria-label={alt || 'avatar'} />
    }

    return <img src={src} alt={alt || 'avatar'} />
}

const RatingAvatar = ({ player, small = false }) => (
    <span className={`rating-avatar ${small ? 'rating-avatar--small' : ''}`}>
        {player.avatarUrl ? renderAvatarMedia(getAssetUrl(player.avatarUrl), player.username) : getAvatarFallback(player.username)}
    </span>
)

const RankTierImage = ({ tier, className = '' }) => {
    const imageUrl = getAssetUrl(tier?.imageUrl)

    if (!imageUrl) {
        return null
    }

    return (
        <span className={className}>
            <img src={imageUrl} alt={tier?.label || 'rank'} />
        </span>
    )
}

const getAvatarFallback = (username = '') => username.trim().slice(0, 1).toUpperCase() || '?'

const getRankIcon = (rank) => {
    if (rank === 1) return '♛ 1'
    if (rank === 2) return '2'
    if (rank === 3) return '3'

    return rank
}

const getSortLabel = (sort, sortOptions, t) => {
    const option = sortOptions.find((item) => item.key === sort)

    return `${t('rating.board.sortPrefix')}: ${option?.label || t('rating.sort.rating')}`
}

export default RatingPage
