import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/shared/hooks/useAuth'
import { leaderboardAPI } from '@/shared/api/leaderboard'
import './HomePage.css'

import bunnerBg from './assets/bunner/bunner_bg.png'
import bunnerImg from './assets/bunner/bunner_img.png'
import modeSolo from './assets/modes/mode_solo.png'
import mode1vs1 from './assets/modes/mode_1vs1.png'
import mode2vs2 from './assets/modes/mode_2vs2.png'
import mode5vs5 from './assets/modes/mode_5vs5.png'
import modeRoyale from './assets/modes/mode_royal.png'
import donatBg from './assets/donats/donat_bg.png'
import donationHeart from './assets/donats/icons/hearth.png'
import payingForServersIcon from './assets/donats/icons/paying-for-servers.png'
import newModesIcon from './assets/donats/icons/new-modes.png'
import tournamentsIcon from './assets/donats/icons/tournaments-and-events.png'
import projectDevelopmentIcon from './assets/donats/icons/project-development.png'
import rankBronze from '@/assets/runks/bronze.png'
import rankSilver from '@/assets/runks/silver.png'
import rankGold from '@/assets/runks/gold.png'
import rankPlatinum from '@/assets/runks/platinum.png'
import rankDiamond from '@/assets/runks/diamond.png'
import rankMaster from '@/assets/runks/master.png'
import rankLegend from '@/assets/runks/legend.png'
import GlowEffect from '@/shared/ui/GlowEffect'

const rankImages = {
    bronze: rankBronze,
    silver: rankSilver,
    gold: rankGold,
    platinum: rankPlatinum,
    diamond: rankDiamond,
    master: rankMaster,
    legend: rankLegend,
}

const arenaStats = [
    { key: 'online', icon: 'fas fa-users', value: '2,481', label: 'онлайн' },
    { key: 'matches', icon: 'fas fa-clock', value: '128', label: 'матчей сейчас' },
    { key: 'queue', icon: 'far fa-user', value: '56', label: 'игроков в очереди' },
    { key: 'season', icon: 'fa-solid fa-chart-line', value: 'Сезон 1', label: '' },
]

const gameModes = [
    {
        key: 'solo',
        title: 'Solo',
        description: 'Тренеруйся в одиночном режиме, стань лучшим',
        // queue: 'В очереди: 56 игроков',
        to: '/game/solo',
        image: modeSolo,
        tone: 'violet',
    },
    {
        key: '1v1',
        title: '1vs1',
        label: 'Рекомендуем',
        description: 'классическая дуэль',
        queue: 'В очереди: 24 игрока',
        to: '/game/1v1',
        image: mode1vs1,
        tone: 'blue',
    },
    {
        key: '2v2',
        title: '2vs2',
        description: 'играйте в паре',
        queue: 'В очереди: 18 команд',
        to: '/game/2v2',
        image: mode2vs2,
        tone: 'green',
    },
    {
        key: '5v5',
        title: '5vs5',
        description: 'массовая битва команд',
        queue: 'В очереди: 12 команд',
        to: '/game/5v5',
        image: mode5vs5,
        tone: 'orange',
    },
    {
        key: 'royale',
        title: 'Royale',
        description: 'последний выживший',
        queue: 'В очереди: 31 игрок',
        to: '/game/royale',
        image: modeRoyale,
        tone: 'magenta',
    },
]

const donationBenefits = [
    {
        key: 'servers',
        icon: payingForServersIcon,
        title: 'Оплата серверов',
        description: 'Стабильная игра без лагов',
    },
    {
        key: 'modes',
        icon: newModesIcon,
        title: 'Новые режимы',
        description: 'Больше битв, больше эмоций',
    },
    {
        key: 'events',
        icon: tournamentsIcon,
        title: 'Турниры и события',
        description: 'Призы, рейтинги и активности',
    },
    {
        key: 'development',
        icon: projectDevelopmentIcon,
        title: 'Развитие проекта',
        description: 'Новые функции, звуки и улучшения',
    },
]

const HomePage = () => {
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
        <section className="section home-page">
            <div className="container home-container">

                <section className="home-bunner" style={{ '--home-bunner-bg': `url(${bunnerBg})` }}>
                    <div>
                        <section className="home-arena-panel" aria-label="Статистика арены">
                            {arenaStats.map((stat) => (
                                <div className="home-arena-panel__item" key={stat.key}>
                                    <span className="home-arena-panel__icon">
                                        <i className={stat.icon}></i>
                                    </span>
                                    <span>
                                        <strong>{stat.value}</strong>
                                        <small>{stat.label}</small>
                                    </span>
                                </div>
                            ))}
                        </section>
                        <div className="home-bunner__content">
                            <h1>
                                Сражайся. Стань<br />
                                <span className='glow-text'>легендой.</span>
                            </h1>
                            <p>
                                Классический тетрис в новом формате. Динамичные PvP-битвы,
                                уникальные режимы и настоящая кибер-арена ждут тебя!
                            </p>

                            <div className="home-bunner__actions">
                                <Link to="/game/solo" className="home-primary-button">
                                    <i className="fas fa-play"></i>
                                    Играть сейчас
                                </Link>
                                <Link to="/rating" className="home-secondary-button button btn-hover-shine">
                                    <i className="fas fa-crown"></i>
                                    Рейтинг арены
                                </Link>
                            </div>
                        </div>
                    </div>

                    <div className="home-bunner__preview" aria-label="PvP Tetris preview">
                        <img src={bunnerImg} alt="" />
                    </div>
                </section>

                <section className="home-modes" aria-labelledby="home-modes-title">
                    <h2 id="home-modes-title">
                        <i className="fas fa-check"></i>
                        Выбери режим
                    </h2>

                    <div className="home-modes__grid">
                        {gameModes.map((mode) => (
                            <Link
                                className={`home-mode-card home-mode-card--${mode.tone}`}
                                key={mode.key}
                                to={mode.to}
                                style={{ '--mode-bg': `url(${mode.image})` }}
                            >
                                {mode.label ? <span className="home-mode-card__label">{mode.label}</span> : null}
                                <span className="home-mode-card__title">{mode.title}</span>
                                <span className="home-mode-card__description">{mode.description}</span>
                                <span className="home-mode-card__footer">
                                    <span>{mode.queue}</span>
                                    <i className="fas fa-arrow-right"></i>
                                </span>
                            </Link>
                        ))}
                    </div>
                </section>

                <section className="home-dashboard" aria-label="Сезонные данные">
                    <GlowEffect>
                        <section className="home-leaders-panel">
                            <div className="home-panel-heading">
                                <h2>Топ игроков</h2>
                                <span>Сезон 1</span>
                            </div>

                            {isTopLoading ? (
                                <div className="home-panel-state">
                                    <i className="fas fa-sync-alt"></i>
                                    Загружаем рейтинг...
                                </div>
                            ) : topPlayers.length === 0 ? (
                                <div className="home-panel-state">
                                    <i className="fas fa-database"></i>
                                    Рейтинг пока пуст
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
                                            <strong>{formatNumber(player.rating)}</strong>
                                        </Link>
                                    ))}
                                </div>
                            )}

                            <Link to="/rating" className="button home-panel-button btn-hover-shine">
                                Смотреть полный рейтинг
                            </Link>
                        </section>
                    </GlowEffect>
                    <GlowEffect>
                        <section className="home-player-stats-panel">
                            <div className="home-panel-heading">
                                <h2>Статистика</h2>
                                <span>Сезон 1</span>
                            </div>

                            {isAuthLoading ? (
                                <div className="home-panel-state home-panel-state--stats">
                                    <i className="fas fa-sync-alt"></i>
                                    Загружаем статистику...
                                </div>
                            ) : isAuth ? (
                                <div className="home-player-stats">
                                    <div className="home-player-stats__values">
                                        <StatRow label="Победы" value={formatNumber(playerStats.wins)} />
                                        <StatRow label="Матчи" value={formatNumber(playerStats.totalMatches)} />
                                        <StatRow label="Винрейт" value={`${playerStats.winRate}%`} />
                                        <StatRow label="Ранг" value={playerStats.rank?.label || 'Bronze'} />
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
                                                <span>{formatNumber(playerStats.rankPoints)} очков</span>
                                                <span>до {formatNumber(playerStats.nextRankPoints)}</span>
                                            </div>
                                            <div className="home-rank-progress__bar">
                                                <span style={{ width: `${playerStats.progress}%` }} />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="home-rank-progress home-rank-progress--max">
                                            Максимальный ранг сезона
                                        </div>
                                    )}

                                    <Link to="/profile" className="button home-panel-button home-panel-button--filled">
                                        Перейти в профиль
                                    </Link>
                                </div>
                            ) : (
                                <div className="home-player-stats home-player-stats--guest">
                                    <div className="home-player-rank home-player-rank--empty">
                                        <i className="fas fa-user-lock"></i>
                                    </div>
                                    <p>У гостей нет ранга. Зарегистрируйтесь, чтобы открыть сезонную статистику и прогресс ранга.</p>
                                    <Link to="/register" className="button home-panel-button btn-hover-shine home-panel-button--filled">
                                        Зарегистрироваться
                                    </Link>
                                </div>
                            )}
                        </section>
                    </GlowEffect>
                </section>

                <section className="home-donation" style={{ '--donation-bg': `url(${donatBg})` }} aria-labelledby="home-donation-title">
                    <div className="home-donation__content">

                        <div className="home-donation__heading">
                            <div className="home-donation__content-header">
                                <img className="home-donation__heart" src={donationHeart} alt="" />
                                <h2 id="home-donation-title">
                                    <span>Поддержи</span>
                                    <strong className='glow-text'>развитие проекта</strong>
                                </h2>
                            </div>
                            <p>
                                PvP Tetris — это проект одного разработчика, сделанный с любовью к игре
                                и киберспорту. Ваша поддержка помогает проекту расти и становиться
                                лучше с каждым днём.
                            </p>
                        </div>

                        <div className="home-donation__benefits">
                            {donationBenefits.map((benefit) => (
                                <article className="home-donation-benefit" key={benefit.key}>
                                    <img src={benefit.icon} alt="" />
                                    <h3>{benefit.title}</h3>
                                    <p>{benefit.description}</p>
                                </article>
                            ))}
                        </div>

                        <Link to="/support" className="home-donation__button">
                            <i className="fas fa-heart"></i>
                            Поддержать проект
                        </Link>

                        <p className="home-donation__note">
                            Никаких преимуществ в игре — только поддержка и развитие.
                        </p>
                    </div>
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

const getRankImage = (rank) => {
    const imageUrl = getAssetUrl(rank?.imageUrl)

    return imageUrl || rankImages[rank?.key] || rankBronze
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

export default HomePage
