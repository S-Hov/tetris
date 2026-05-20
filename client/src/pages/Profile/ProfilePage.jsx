import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GlowEffect from '@/shared/ui/GlowEffect'
import AppSwitch from '@/shared/ui/AppSwitch'
import { useAuth } from '@/shared/hooks/useAuth'
import { useGlowEffect } from '@/shared/hooks/useGlowEffect.js'
import { useTheme } from '@/shared/hooks/useTheme.js'
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
    rank: 'Bronze',
    rating: 0,
}

const ProfilePage = () => {
    const navigate = useNavigate()
    const { checkAuth, logout, user } = useAuth()
    const { isGlowEffectEnabled, toggleGlowEffect } = useGlowEffect()
    const { isDarkTheme, toggleTheme } = useTheme()

    useEffect(() => {
        const refreshProfile = async () => {
            await checkAuth({ silent: true })
        }

        refreshProfile()
    }, [checkAuth])

    const profile = useMemo(() => {
        const displayName = user?.username || user?.email?.split('@')[0] || 'NeoMaster'

        return {
            id: user?.id,
            name: displayName,
            email: user?.email || 'neo@pvp-tetris.com',
            avatarUrl: getAssetUrl(user?.avatar_url),
            status: user?.status || 'active',
            country: fallbackProfile.country,
            memberSince: formatMemberSince(user?.created_at) || fallbackProfile.memberSince,
            lastLogin: formatLastLogin(user?.last_login_at) || fallbackProfile.lastLogin,
            rank: user?.rankStats?.rank?.label || fallbackProfile.rank,
            rating: user?.rankStats?.rankPoints ?? fallbackProfile.rating,
            rankStats: user?.rankStats || null,
            stats: {
                totalGames: user?.stats?.totalGames || 0,
                wins: user?.stats?.wins || 0,
            },
            recentMatches: Array.isArray(user?.recentMatches) ? user.recentMatches : [],
        }
    }, [user])

    const playerStats = useMemo(() => {
        const totalGames = profile.rankStats?.totalMatches || profile.stats.totalGames
        const wins = profile.rankStats?.wins || 0
        const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : '0.0'

        return [
            {
                key: 'games',
                title: 'Ranked игр',
                value: String(totalGames),
                change: 'Влияют на ранг',
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
                title: 'MMR',
                value: String(profile.rankStats?.mmr || 1000),
                change: 'Скрытый подбор соперников',
                icon: 'fas fa-wave-square',
            },
            {
                key: 'crystals',
                title: 'Solo рекорд',
                value: String(profile.rankStats?.bestSoloScore || 0),
                change: `${profile.rankStats?.losses || 0} поражений | ${profile.rankStats?.draws || 0} ничьих`,
                icon: 'fas fa-star',
            },
        ]
    }, [profile.rankStats, profile.stats.totalGames])

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

                            <div className="profile-welcome-actions">
                                <Link to="/account-settings" className="button profile-settings-shortcut">
                                    <i className="fas fa-gear"></i>
                                    Настройки
                                </Link>
                                <div className="profile-rank-badge">
                                    <i className="fas fa-trophy"></i>
                                    <span>{profile.rank}</span>
                                    <i className="fas fa-chevron-right"></i>
                                    <strong>{profile.rating}</strong>
                                    <small>очков</small>
                                </div>
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
                        <GlowEffect className="profile-card-glow">
                            <div className="glow-effect">
                                <div className="profile-card-header">
                                    <div className="profile-avatar">
                                        {profile.avatarUrl ? (
                                            profileAvatarMedia(profile.avatarUrl, profile.name)
                                        ) : (
                                            <i className="fas fa-user-astronaut"></i>
                                        )}
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
                                    <Link to="/account-settings" className="button">
                                        <i className="fas fa-pen"></i>
                                        Редактировать профиль
                                    </Link>
                                    <button type="button" className="button profile-logout-button" onClick={handleLogout}>
                                        <i className="fas fa-sign-out-alt"></i>
                                        Выйти
                                    </button>
                                </div>
                            </div>
                        </GlowEffect>
                    </section>

                    <section className="profile-history-card">
                        <GlowEffect className="profile-history-card-glow-bg">
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

                <section className="profile-support-card">
                    <GlowEffect>
                        <div className="glow-effect profile-support-content">
                            <div>
                                <div className="profile-section-title">
                                    <i className="fas fa-life-ring"></i>
                                    Поддержка
                                </div>
                                <p>
                                    Нашли ошибку, хотите предложить режим или рассказать, что в матче пошло не так?
                                    Напишите в поддержку, а свои обращения можно посмотреть здесь же в личном кабинете.
                                </p>
                            </div>
                            <div className="profile-support-actions">
                                <Link to="/support" className="button">
                                    <i className="fas fa-paper-plane"></i>
                                    Обратиться в поддержку
                                </Link>
                                <Link to="/support/requests" className="button profile-support-secondary">
                                    <i className="fas fa-inbox"></i>
                                    Мои обращения
                                </Link>
                            </div>
                        </div>
                    </GlowEffect>
                </section>

                <section className="profile-quick-settings-card">
                    <GlowEffect>
                        <div className="glow-effect profile-quick-settings-content">
                            <div>
                                <div className='profile-quick-settings-header'>
                                    <div className="profile-section-title">
                                        <i className="fas fa-sliders"></i>
                                        Быстрые настройки
                                    </div>
                                    <Link to="/account-settings" className="button profile-advanced-settings-link">
                                        <i className="fas fa-up-right-from-square"></i>
                                        Открыть расширенные настройки
                                    </Link>
                                </div>
                            </div>
                            <button
                                type="button"
                                className="profile-theme-toggle"
                                aria-pressed={isDarkTheme}
                                onClick={toggleTheme}
                            >
                                <span>Тёмная тема</span>
                                <AppSwitch checked={isDarkTheme} />
                            </button>
                            <button
                                type="button"
                                className="profile-theme-toggle"
                                aria-pressed={isGlowEffectEnabled}
                                onClick={toggleGlowEffect}
                            >
                                <span>Подсветка курсора</span>
                                <AppSwitch checked={isGlowEffectEnabled} />
                            </button>

                        </div>
                    </GlowEffect>
                </section>
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

const getAssetUrl = (value) => {
    if (!value) {
        return ''
    }

    if (/^https?:\/\//i.test(value)) {
        return value
    }

    const baseUrl = import.meta.env.VITE_API_URL || (
        typeof window !== 'undefined' && window.location.hostname
            ? `http://${window.location.hostname}:8880`
            : 'http://127.0.0.1:8880'
    )

    return `${baseUrl}${value}`
}

const profileAvatarMedia = (src, alt) => {
    if (src.toLowerCase().includes('.webm')) {
        return <video src={src} autoPlay loop muted playsInline aria-label={alt} />
    }

    return <img src={src} alt={alt} />
}

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
