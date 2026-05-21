import { useEffect, useMemo, useState } from 'react'
import GlowEffect from '@/shared/ui/GlowEffect'
import { leaderboardAPI } from '@/shared/api/leaderboard'
import './RatingPage.css'

const sortOptions = [
    { key: 'rating', label: 'Очки ранга', icon: 'fas fa-bolt' },
    { key: 'wins', label: 'Победы', icon: 'fas fa-trophy' },
    { key: 'winRate', label: 'Win rate', icon: 'fas fa-percentage' },
    { key: 'games', label: 'Игры', icon: 'fas fa-gamepad' },
    { key: 'mmr', label: 'MMR', icon: 'fas fa-wave-square' },
    { key: 'bestSolo', label: 'Solo рекорд', icon: 'fas fa-star' },
]

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
    const totalGames = useMemo(
        () => players.reduce((sum, player) => sum + player.totalGames, 0),
        [players]
    )

    return (
        <section className="section rating-page">
            <div className="container rating-container">
                <section className="rating-hero">
                    <GlowEffect>
                        <div className="glow-effect rating-hero-content">
                            <div className="rating-title-block">
                                <p className="rating-eyebrow">PvP Tetris</p>
                                <h1>
                                    <i className="fas fa-trophy"></i>
                                    Мировой рейтинг
                                </h1>
                                <p>Таблица сильнейших игроков по ранговым очкам из базы данных.</p>
                            </div>

                            <div className="rating-summary">
                                <span>
                                    <strong>{players.length}</strong>
                                    игроков
                                </span>
                                <span>
                                    <strong>{formatNumber(totalGames)}</strong>
                                    матчей
                                </span>
                            </div>
                        </div>
                    </GlowEffect>
                </section>

                <section className="rating-controls-card">
                    <GlowEffect>
                        <div className="glow-effect rating-controls">
                            <div className="rating-control-group" aria-label="Система рейтинга">
                                <span className="rating-chip rating-chip--active">
                                    <i className="fas fa-medal"></i>
                                    Ranked season
                                </span>
                                <span className="rating-chip">
                                    <i className="fas fa-lock"></i>
                                    MMR скрыт в матчмейкинге
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

                {topPlayers.length > 0 && (
                    <section className="rating-podium" aria-label="Топ игроки">
                        {topPlayers.map((player) => (
                            <article key={player.id} className={`rating-podium-card rating-podium-card--rank-${player.rank}`}>
                                <GlowEffect>
                                    <div className="glow-effect">
                                        <span className="rating-podium-rank">{getRankIcon(player.rank)}</span>
                                        <RatingAvatar player={player} />
                                        <h2>{player.username}</h2>
                                        <strong>{formatNumber(player.rating)}</strong>
                                        <small>{player.rankTier?.label || 'Bronze'} | {player.wins} побед | {player.winRate}%</small>
                                    </div>
                                </GlowEffect>
                            </article>
                        ))}
                    </section>
                )}

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
                                    Пока нет игроков для выбранного периода
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
                                                                <small>MMR {player.mmr}</small>
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="rating-value">{formatNumber(player.rating)}</td>
                                                    <td>{player.wins}</td>
                                                    <td>{player.winRate}%</td>
                                                    <td>{player.totalGames}</td>
                                                    <td>{player.rankTier?.label || 'Bronze'}</td>
                                                    <td>{formatNumber(player.bestSoloScore)}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            <footer className="rating-update-info">
                                <i className="fas fa-shield-alt"></i>
                                Leaderboard сортируется по rank_points; ranked влияет на рейтинг и MMR, casual/private только на историю.
                            </footer>
                        </div>
                    </GlowEffect>
                </section>
            </div>
        </section>
    )
}

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
        {player.avatarUrl ? renderAvatarMedia(getAssetUrl(player.avatarUrl), player.username) : player.avatar}
    </span>
)

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
