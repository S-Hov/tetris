import { useEffect, useMemo, useState } from 'react'
import GlowEffect from '@/shared/ui/GlowEffect'
import { leaderboardAPI } from '@/shared/api/leaderboard'
import seasonBg from './assets/backgrounds/season_bg.png'
import goldBg from './assets/leaders_bg/gold.png'
import silverBg from './assets/leaders_bg/silver.png'
import bronzeBg from './assets/leaders_bg/bronze.png'
import './RatingPage.css'

const sortOptions = [
    { key: 'rating', label: 'Очки ранга', icon: 'fas fa-bolt' },
    { key: 'wins', label: 'Победы', icon: 'fas fa-trophy' },
    { key: 'winRate', label: 'Win rate', icon: 'fas fa-percentage' },
    { key: 'games', label: 'Игры', icon: 'fas fa-gamepad' },
    { key: 'mmr', label: 'MMR', icon: 'fas fa-wave-square' },
    { key: 'bestSolo', label: 'Solo рекорд', icon: 'fas fa-star' },
]

const podiumConfig = {
    1: { bg: goldBg, label: 'Первое место', accent: 'gold' },
    2: { bg: silverBg, label: 'Второе место', accent: 'silver' },
    3: { bg: bronzeBg, label: 'Третье место', accent: 'bronze' },
}

const RatingPage = () => {
    const [sort, setSort] = useState('rating')
    const [players, setPlayers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')

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
                    setError(requestError?.message || 'Не удалось загрузить рейтинг')
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
    }, [sort])

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

    return (
        <section className="section rating-page">
            <div className="container rating-container">
                <section className="rating-hero">
                    <GlowEffect>
                        <div className="rating-hero-main">
                            <span className="rating-eyebrow">PvP Tetris</span>

                            <div className='rating-hero-header'>
                                <h1 className='glow-text'>Зал легенд</h1>
                                <div className="rating-summary" aria-label="Статистика рейтинга">
                                    <span>
                                        <strong>{formatNumber(players.length)}</strong>
                                        игроков онлайн
                                    </span>
                                    <span>
                                        <strong>{formatNumber(totalGames)}</strong>
                                        матчей сыграно
                                    </span>
                                </div>
                            </div>
                            <p>Лучшие игроки арены. Докажи, что ты достоин быть среди них.</p>
                        </div>
                    </GlowEffect>


                    <aside className="rating-season" style={{ backgroundImage: `url(${seasonBg})` }}>
                        <span>Сезон 1</span>
                    </aside>
                </section>

                <section className="rating-controls-card">
                    <GlowEffect>
                        <div className="glow-effect rating-controls">
                            <div className="rating-control-group" aria-label="Система рейтинга">
                                <span className="rating-chip rating-chip--active">
                                    <i className="fas fa-trophy"></i>
                                    Ranked season
                                </span>
                            </div>

                            <div className="rating-sort-panel" aria-label="Сортировка рейтинга">
                                <span>Сортировать</span>
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
                    <section className="rating-podium" aria-label="Топ игроки">
                        {podiumPlayers.map((player) => (
                            <PodiumCard key={player.id} player={player} />
                        ))}
                    </section>
                )}

                <div className="rating-content-grid">
                    <section className="rating-board">
                        <GlowEffect>
                            <div className="glow-effect rating-board-inner">
                                <div className="rating-board-header">
                                    <div>
                                        <h2>Таблица лидеров</h2>
                                        <p>Глобальный рейтинг | {getSortLabel(sort)}</p>
                                    </div>
                                    <span>
                                        <i className="fas fa-sync-alt"></i>
                                        Живые данные
                                    </span>
                                </div>

                                {isLoading ? (
                                    <div className="rating-state">
                                        <i className="fas fa-sync-alt"></i>
                                        Загружаем рейтинг...
                                    </div>
                                ) : error ? (
                                    <div className="rating-state rating-state--error">
                                        <i className="fas fa-exclamation-triangle"></i>
                                        {error}
                                    </div>
                                ) : players.length === 0 ? (
                                    <div className="rating-state">
                                        <i className="fas fa-database"></i>
                                        Пока нет игроков для выбранной сортировки
                                    </div>
                                ) : (
                                    <div className="rating-table-wrap">
                                        <table className="rating-table">
                                            <thead>
                                                <tr>
                                                    <th>#</th>
                                                    <th>Игрок</th>
                                                    <th>Рейтинг</th>
                                                    <th>Победы</th>
                                                    <th>Win rate</th>
                                                    <th>Игры</th>
                                                    <th>Ранг</th>
                                                    <th>Solo рекорд</th>
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
                                                                    <small>MMR {formatNumber(player.mmr)}</small>
                                                                </span>
                                                            </div>
                                                        </td>
                                                        <td className="rating-value">{formatNumber(player.rating)}</td>
                                                        <td>{formatNumber(player.wins)}</td>
                                                        <td>{player.winRate}%</td>
                                                        <td>{formatNumber(player.totalGames)}</td>
                                                        <td>
                                                            <span className="rating-rank-tier">
                                                                <RankTierImage tier={player.rankTier} className="rating-rank-tier-image" />
                                                                {player.rankTier?.label || 'Bronze'}
                                                            </span>
                                                        </td>
                                                        <td>{formatNumber(player.bestSoloScore)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}

                                <footer className="rating-update-info">
                                    <i className="fas fa-shield-alt"></i>
                                    Рейтинг обновляется автоматически по данным матчей.
                                </footer>
                            </div>
                        </GlowEffect>
                    </section>

                    <aside className="rating-sidebar" aria-label="Данные первого места">
                        <LeaderPanel player={leader} />
                    </aside>
                </div>
            </div>
        </section>
    )
}

const PodiumCard = ({ player }) => {
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
                {player.rankTier?.label || 'Bronze'}
            </span>
            <strong>{formatNumber(player.rating)} <small>MMR</small></strong>
            <div className="rating-podium-stats">
                <span>
                    <small>Win rate</small>
                    {player.winRate}%
                </span>
                <span>
                    <small>Побед</small>
                    {formatNumber(player.wins)}
                </span>
                <span>
                    <small>Игры</small>
                    {formatNumber(player.totalGames)}
                </span>
            </div>
        </article>
    )
}

const LeaderPanel = ({ player }) => {
    if (!player) {
        return (
            <div className="rating-leader-card rating-leader-card--empty">
                <h2>Первое место</h2>
                <p>Данные появятся после загрузки рейтинга.</p>
            </div>
        )
    }

    return (
        <>
            <div className="rating-leader-card">
                <h2>Игрок Сезона</h2>
                <RatingAvatar player={player} />
                <strong>{player.username} <span>🇷🇺</span></strong>
                <span className="rating-tier-pill">
                    <RankTierImage tier={player.rankTier} className="rating-rank-tier-image rating-rank-tier-image--pill" />
                    {player.rankTier?.label || 'Bronze'}
                </span>
                <b>{formatNumber(player.rating)} <small>MMR</small></b>
            </div>

            <div className="rating-leader-stats">
                <h2>Рекорды сезона</h2>
                <LeaderStat label="Максимальный MMR" value={formatNumber(player.mmr)} />
                <LeaderStat label="Лучшие победы" value={formatNumber(player.wins)} />
                <LeaderStat label="Лучший Win Rate" value={`${player.winRate}%`} />
                <LeaderStat label="Solo рекорд" value={formatNumber(player.bestSoloScore)} />
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

const formatNumber = (value) => new Intl.NumberFormat('ru-RU').format(Number(value) || 0)

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

const getSortLabel = (sort) => {
    const option = sortOptions.find((item) => item.key === sort)

    return option ? `сортировка: ${option.label}` : 'сортировка: Рейтинг'
}

export default RatingPage
