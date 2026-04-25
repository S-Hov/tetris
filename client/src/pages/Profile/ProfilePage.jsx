import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GlowEffect from '@/shared/ui/GlowEffect'
import { useAuth } from '@/shared/hooks/useAuth'
import {
    formatMatchDate,
    formatMatchResultLabel,
    getMatchModeLabel,
    getMatchResultClass,
} from '@/shared/lib/matches/presentation.js'
import './ProfilePage.css'

const fallbackProfile = {
    country: 'Россия',
    memberSince: 'января 2024',
    lastLogin: 'Сегодня, 14:32',
    rank: 'Мастер I',
    rating: 2840,
}

const defaultSettings = [
    {
        key: 'matchNotifications',
        title: 'Уведомления о матчах',
        description: 'Получать оповещения о новых играх и турнирах',
        enabled: false,
    },
    {
        key: 'twoFactor',
        title: 'Двухфакторная аутентификация',
        description: 'Дополнительная защита аккаунта',
        enabled: false,
    },
    {
        key: 'publicStats',
        title: 'Показывать статистику в профиле',
        description: 'Другие игроки видят ваши достижения',
        enabled: true,
    },
]

const ProfilePage = () => {
    const navigate = useNavigate()
    const { checkAuth, logout, user } = useAuth()
    const [settings, setSettings] = useState(defaultSettings)
    const [isRefreshing, setIsRefreshing] = useState(false)

    useEffect(() => {
        let ignore = false

        const refreshProfile = async () => {
            setIsRefreshing(true)

            try {
                await checkAuth({ silent: true })
            } finally {
                if (!ignore) {
                    setIsRefreshing(false)
                }
            }
        }

        refreshProfile()

        return () => {
            ignore = true
        }
    }, [checkAuth])

    const profile = useMemo(() => {
        const displayName = user?.username || user?.email?.split('@')[0] || 'NeoMaster'

        return {
            id: user?.id,
            name: displayName,
            email: user?.email || 'neo@pvp-tetris.com',
            status: user?.status || 'active',
            country: fallbackProfile.country,
            memberSince: formatMemberSince(user?.created_at) || fallbackProfile.memberSince,
            lastLogin: formatLastLogin(user?.last_login_at) || fallbackProfile.lastLogin,
            rank: fallbackProfile.rank,
            rating: fallbackProfile.rating,
            stats: {
                totalGames: user?.stats?.totalGames || 0,
                wins: user?.stats?.wins || 0,
            },
            recentMatches: Array.isArray(user?.recentMatches) ? user.recentMatches : [],
        }
    }, [user])

    const playerStats = useMemo(() => {
        const totalGames = profile.stats.totalGames
        const wins = profile.stats.wins
        const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0'

        return [
            {
                key: 'games',
                title: 'Всего игр',
                value: String(totalGames),
                change: 'Актуально по данным БД',
                icon: 'fas fa-chart-line',
            },
            {
                key: 'wins',
                title: 'Побед',
                value: String(wins),
                change: `Процент побед: ${winRate}%`,
                icon: 'fas fa-trophy',
            },
            {
                key: 'combo',
                title: 'Макс. комбо',
                value: '14',
                change: 'Рекорд серии',
                icon: 'fas fa-fire',
            },
            {
                key: 'crystals',
                title: 'Заработано',
                value: '12.4k',
                unit: 'кристаллов',
                change: '+340 за месяц',
                icon: 'fas fa-gem',
            },
        ]
    }, [profile.stats.totalGames, profile.stats.wins])

    const matchHistory = useMemo(
        () => profile.recentMatches.map((match) => ({
            id: match.id,
            mode: getMatchModeLabel(match.mode),
            result: match.result === 'win' ? 'win' : 'loss',
            opponent: match.opponent,
            score: `${match.score}-${match.opponentScore}`,
            date: formatMatchDate(match.playedAt),
        })),
        [profile.recentMatches]
    )

    const handleLogout = async () => {
        await logout()
        navigate('/login', { replace: true })
    }

    const toggleSetting = (settingKey) => {
        setSettings((currentSettings) =>
            currentSettings.map((setting) =>
                setting.key === settingKey
                    ? { ...setting, enabled: !setting.enabled }
                    : setting
            )
        )
    }

    return (
        <section className="section profile-page">
            <div className="container profile-container">
                <section className="profile-welcome">
                    <GlowEffect>
                        <div className="glow-effect profile-welcome-content">
                            <div>
                                <p className="profile-eyebrow">Личный кабинет</p>
                                <h1>Добро пожаловать, {profile.name}!</h1>
                                <p>Ваша статистика и достижения на PvP арене</p>
                            </div>

                            <div className="profile-rank-badge">
                                <i className="fas fa-trophy"></i>
                                <span>{profile.rank}</span>
                                <i className="fas fa-chevron-right"></i>
                                <strong>{profile.rating}</strong>
                                <small>очков</small>
                            </div>
                        </div>
                    </GlowEffect>
                </section>

                <section className="profile-stats-grid" aria-label="Статистика игрока">
                    {playerStats.map((stat) => (
                        <article key={stat.key} className="profile-stat-card">
                            <GlowEffect>
                                <div className="glow-effect">
                                    <div className="profile-stat-title">{stat.title}</div>
                                    <div className="profile-stat-value">
                                        {stat.value}
                                        {stat.unit && <span>{stat.unit}</span>}
                                    </div>
                                    <div className="profile-stat-change">
                                        <i className={stat.icon}></i>
                                        {stat.change}
                                    </div>
                                </div>
                            </GlowEffect>
                        </article>
                    ))}
                </section>

                <div className="profile-main-grid">
                    <section className="profile-card">
                        <GlowEffect className='profile-card-glow'>
                            <div className="glow-effect">
                                <div className="profile-card-header">
                                    <div className="profile-avatar">
                                        <i className="fas fa-user-astronaut"></i>
                                    </div>
                                    <h2>{profile.name}</h2>
                                    <p>Участник с {profile.memberSince}</p>
                                </div>

                                <div className="profile-details">
                                    <DetailRow icon="fas fa-envelope" label="Email" value={profile.email} />
                                    <DetailRow icon="fas fa-map-marker-alt" label="Страна" value={profile.country} />
                                    <DetailRow icon="fas fa-shield-alt" label="Статус" value={formatStatus(profile.status)} />
                                    <DetailRow icon="fas fa-calendar" label="Последний вход" value={profile.lastLogin} />
                                </div>

                                <div className="profile-card-actions">
                                    <button type="button" className="button">
                                        <i className="fas fa-pen"></i>
                                        Редактировать профиль
                                    </button>
                                    <button type="button" className="button profile-logout-button" onClick={handleLogout}>
                                        <i className="fas fa-sign-out-alt"></i>
                                        Выйти
                                    </button>
                                </div>
                            </div>
                        </GlowEffect>
                    </section>

                    <section className="profile-history-card">
                        <GlowEffect>
                            <div className="glow-effect">
                                <div className="profile-section-heading">
                                    <div className="profile-section-title">
                                        <i className="fas fa-history"></i>
                                        История матчей
                                    </div>
                                    <Link to="/matches" className="profile-section-link">
                                        Все матчи
                                    </Link>
                                </div>

                                <div className="profile-match-list">
                                    {matchHistory.length > 0 ? (
                                        matchHistory.map((match) => (
                                            <Link key={match.id} to={`/matches/${match.id}`} className="profile-match-item profile-match-item--link">
                                                <div>
                                                    <span className="profile-match-mode">{match.mode}</span>
                                                    <strong className={`profile-match-result profile-match-result--${getMatchResultClass(match.result)}`}>
                                                        {formatMatchResultLabel(match.result)}
                                                    </strong>
                                                    <span className="profile-match-opponent">{match.opponent}</span>
                                                </div>
                                                <div>
                                                    <strong className="profile-match-score">{match.score}</strong>
                                                    <span className="profile-match-date">{match.date}</span>
                                                </div>
                                            </Link>
                                        ))
                                    ) : (
                                        <article className="profile-match-item">
                                            <div>
                                                <span className="profile-match-mode">Матчи</span>
                                                <strong className="profile-match-result">Пока пусто</strong>
                                                <span className="profile-match-opponent">Сыграйте первую игру, и она появится здесь</span>
                                            </div>
                                            <div>
                                                <strong className="profile-match-score">0</strong>
                                                <span className="profile-match-date">Нет данных</span>
                                            </div>
                                        </article>
                                    )}
                                </div>
                            </div>
                        </GlowEffect>
                    </section>
                </div>

                <section className="profile-settings-card">
                    <GlowEffect>
                        <div className="glow-effect">
                            <div className="profile-section-title">
                                <i className="fas fa-sliders-h"></i>
                                Настройки аккаунта
                            </div>

                            <div className="profile-settings-list">
                                {settings.map((setting) => (
                                    <button
                                        key={setting.key}
                                        type="button"
                                        className="profile-setting-item"
                                        onClick={() => toggleSetting(setting.key)}
                                    >
                                        <span>
                                            <strong>{setting.title}</strong>
                                            <small>{setting.description}</small>
                                        </span>
                                        <span className={`profile-toggle ${setting.enabled ? 'profile-toggle--active' : ''}`}>
                                            <span></span>
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </GlowEffect>
                </section>

                <footer className="profile-footer">
                    <span>{isRefreshing ? 'Обновляем данные профиля...' : 'Данные аккаунта загружены с сервера'}</span>
                    <nav>
                        <Link to="/">Главная</Link>
                        <Link to="/rating">Рейтинг</Link>
                        <Link to="/support">Поддержка</Link>
                    </nav>
                </footer>
            </div>
        </section>
    )
}

const DetailRow = ({ icon, label, value }) => (
    <div className="profile-detail-row">
        <span>
            <i className={icon}></i>
            {label}
        </span>
        <strong>{value}</strong>
    </div>
)

const formatStatus = (status) => {
    if (status === 'active') return 'Активен'
    if (status === 'pending_verification') return 'Ожидает подтверждения'

    return status || 'Активен'
}

const formatMemberSince = (value) => {
    if (!value) {
        return null
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return null
    }

    return new Intl.DateTimeFormat('ru-RU', {
        month: 'long',
        year: 'numeric',
    }).format(date)
}

const formatLastLogin = (value) => {
    if (!value) {
        return null
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return null
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

export default ProfilePage
