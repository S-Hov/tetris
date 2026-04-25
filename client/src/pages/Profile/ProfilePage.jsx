import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GlowEffect from '@/shared/ui/GlowEffect'
import { useAuth } from '@/shared/hooks/useAuth'
import './ProfilePage.css'

const fallbackProfile = {
    country: 'Россия',
    memberSince: 'января 2024',
    lastLogin: 'Сегодня, 14:32',
    rank: 'Мастер I',
    rating: 2840,
}

const playerStats = [
    {
        key: 'games',
        title: 'Всего игр',
        value: '347',
        change: '+12 на этой неделе',
        icon: 'fas fa-chart-line',
    },
    {
        key: 'wins',
        title: 'Побед',
        value: '218',
        change: 'Процент побед: 62.8%',
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

const matchHistory = [
    { mode: '1 VS 1', result: 'win', opponent: 'ShadowBlade', score: '3-1', date: 'Сегодня, 13:20' },
    { mode: '2 VS 2', result: 'win', opponent: 'Team Chaos', score: '2-0', date: 'Вчера, 21:45' },
    { mode: '1 VS 1', result: 'loss', opponent: 'TetrisGod', score: '0-3', date: 'Вчера, 19:10' },
    { mode: '5 VS 5', result: 'win', opponent: 'Red Squad', score: '4-2', date: '17 апр, 22:30' },
    { mode: 'ROYALE', result: 'win', opponent: '12 игроков', score: '1st', date: '16 апр, 18:15' },
    { mode: '1 VS 1', result: 'loss', opponent: 'FastDrop', score: '1-3', date: '15 апр, 20:00' },
]

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
            memberSince: fallbackProfile.memberSince,
            lastLogin: fallbackProfile.lastLogin,
            rank: fallbackProfile.rank,
            rating: fallbackProfile.rating,
        }
    }, [user])

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
                                <div className="profile-section-title">
                                    <i className="fas fa-history"></i>
                                    История матчей
                                </div>

                                <div className="profile-match-list">
                                    {matchHistory.map((match) => (
                                        <article key={`${match.mode}-${match.opponent}-${match.date}`} className="profile-match-item">
                                            <div>
                                                <span className="profile-match-mode">{match.mode}</span>
                                                <strong className={`profile-match-result profile-match-result--${match.result}`}>
                                                    {match.result === 'win' ? 'Победа' : 'Поражение'}
                                                </strong>
                                                <span className="profile-match-opponent">{match.opponent}</span>
                                            </div>
                                            <div>
                                                <strong className="profile-match-score">{match.score}</strong>
                                                <span className="profile-match-date">{match.date}</span>
                                            </div>
                                        </article>
                                    ))}
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

export default ProfilePage
