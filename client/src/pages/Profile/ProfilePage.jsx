import { useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import AppSwitch from '@/shared/ui/AppSwitch'
import GlowEffect from '@/shared/ui/GlowEffect'
import ProfileSideNav from '@/widgets/ProfileSideNav'
import { useAuth } from '@/shared/hooks/useAuth'
import { useGlowEffect } from '@/shared/hooks/useGlowEffect.js'
import { useTheme } from '@/shared/hooks/useTheme.js'
import {
    formatMatchDate,
    formatMatchResultLabel,
    getMatchModeLabel,
    getMatchResultClass,
} from '@/shared/lib/matches/presentation.js'
import bronzeRank from '@/assets/runks/bronze.png'
import silverRank from '@/assets/runks/silver.png'
import goldRank from '@/assets/runks/gold.png'
import platinumRank from '@/assets/runks/platinum.png'
import diamondRank from '@/assets/runks/diamond.png'
import masterRank from '@/assets/runks/master.png'
import legendRank from '@/assets/runks/legend.png'
import bronzeBg from './assets/runks_bg/bronze.png'
import silverBg from './assets/runks_bg/silver.png'
import goldBg from './assets/runks_bg/gold.png'
import platinumBg from './assets/runks_bg/platinum.png'
import diamondBg from './assets/runks_bg/diamond.png'
import masterBg from './assets/runks_bg/master.png'
import legendBg from './assets/runks_bg/legend.png'
import bronzeFrame from './assets/ranks_frames/bronze.png'
import silverFrame from './assets/ranks_frames/silver.png'
import goldFrame from './assets/ranks_frames/gold.png'
import platinumFrame from './assets/ranks_frames/platinum.png'
import diamondFrame from './assets/ranks_frames/diamond.png'
import masterFrame from './assets/ranks_frames/master.png'
import legendFrame from './assets/ranks_frames/legend.png'
import './ProfilePage.css'

const RANK_ASSETS = {
    bronze: { icon: bronzeRank, bg: bronzeBg, frame: bronzeFrame },
    silver: { icon: silverRank, bg: silverBg, frame: silverFrame },
    gold: { icon: goldRank, bg: goldBg, frame: goldFrame },
    platinum: { icon: platinumRank, bg: platinumBg, frame: platinumFrame },
    diamond: { icon: diamondRank, bg: diamondBg, frame: diamondFrame },
    master: { icon: masterRank, bg: masterBg, frame: masterFrame },
    legend: { icon: legendRank, bg: legendBg, frame: legendFrame },
}

const ProfilePage = () => {
    const navigate = useNavigate()
    const { checkAuth, logout, user } = useAuth()
    const { isGlowEffectEnabled, toggleGlowEffect } = useGlowEffect()
    const { isDarkTheme, toggleTheme } = useTheme()

    useEffect(() => {
        checkAuth({ silent: true })
    }, [checkAuth])

    const profile = useMemo(() => {
        const rankStats = user?.rankStats || {}
        const rank = rankStats.rank || {}
        const rankName = rank.label || rank.label_ru || 'Bronze'
        const rankKey = normalizeRankKey(rank.key || rankName)
        const rankAssets = RANK_ASSETS[rankKey] || RANK_ASSETS.bronze
        const totalMatches = Number(rankStats.totalMatches ?? user?.stats?.totalGames) || 0
        const wins = Number(rankStats.wins) || 0
        const losses = Number(rankStats.losses) || 0
        const draws = Number(rankStats.draws) || 0
        const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : '0.0'

        return {
            id: user?.id,
            name: user?.username || user?.email?.split('@')[0] || 'Игрок',
            email: user?.email || '',
            status: user?.status || 'active',
            memberSince: formatMemberSince(user?.created_at || user?.createdAt),
            lastLogin: formatLastLogin(user?.last_login_at || user?.lastLoginAt),
            rankName,
            rankKey,
            rankAssets,
            rankPoints: Number(rankStats.rankPoints) || 0,
            mmr: Number(rankStats.mmr) || 1000,
            totalMatches,
            wins,
            losses,
            draws,
            winRate,
            bestSoloScore: Number(rankStats.bestSoloScore) || 0,
            recentMatches: Array.isArray(user?.recentMatches) ? user.recentMatches : [],
        }
    }, [user])

    const stats = useMemo(() => ([
        { key: 'mmr', label: 'MMR', value: formatNumber(profile.rankPoints), note: `${profile.mmr} скрытый MMR`, icon: 'fas fa-gem' },
        { key: 'wins', label: 'Победы', value: formatNumber(profile.wins), note: `${formatNumber(profile.losses)} поражений`, icon: 'fas fa-trophy' },
        { key: 'winRate', label: 'Win Rate', value: `${profile.winRate}%`, note: `${formatNumber(profile.totalMatches)} матчей`, icon: 'fas fa-chart-pie' },
        { key: 'solo', label: 'Solo рекорд', value: formatNumber(profile.bestSoloScore), note: `${formatNumber(profile.draws)} ничьих`, icon: 'fas fa-star' },
        { key: 'member', label: 'В игре', value: profile.memberSince.short, note: profile.memberSince.full, icon: 'fas fa-calendar' },
        { key: 'id', label: 'ID игрока', value: profile.id ? `#${profile.id}` : '-', note: formatStatus(profile.status), icon: 'fas fa-fingerprint' },
    ]), [profile])

    const matchHistory = useMemo(() => profile.recentMatches.slice(0, 6), [profile.recentMatches])

    const handleLogout = async () => {
        await logout()
        navigate('/login', { replace: true })
    }

    return (
        <section className="section profile-page">
            <div className="container profile-shell profile-layout-shell">
                <ProfileSideNav />

                <div className="profile-content profile-layout-content">
                    <GlowEffect className="profile-hero-glow">
                        <section
                            className={`profile-hero profile-hero--${profile.rankKey}`}
                            style={{ '--profile-rank-bg': `url(${profile.rankAssets.bg})` }}
                        >
                            <div className="profile-hero__rank">
                                <img src={profile.rankAssets.icon} alt={profile.rankName} />
                            </div>

                            <div className="profile-hero__player">
                                <span className="profile-rank-pill">{profile.rankName}</span>
                                <div className="profile-hero__name-row">
                                    <h1>{profile.name}</h1>
                                    <Link className="profile-edit-link" to="/account-settings" aria-label="Открыть настройки профиля">
                                        <i className="fas fa-pen"></i>
                                    </Link>
                                </div>
                                <div className="profile-hero__rating">
                                    <i className="fas fa-trophy"></i>
                                    <strong>{formatNumber(profile.rankPoints)}</strong>
                                    <span>MMR</span>
                                </div>
                                <div className="profile-hero__meta">
                                    <span><i className="fas fa-calendar"></i>В игре с {profile.memberSince.full}</span>
                                    <span><i className="fas fa-id-card"></i>ID: {profile.id || '-'}</span>
                                </div>
                            </div>

                            <div className="profile-season-card" style={{ '--profile-rank-frame': `url(${profile.rankAssets.frame})` }}>
                                <span>Season 1</span>
                                <strong>{profile.rankName}</strong>
                            </div>

                            <div className="profile-hero-stats" aria-label="Краткая статистика">
                                <HeroStat icon="fas fa-chart-line" label="Win Rate" value={`${profile.winRate}%`} />
                                <HeroStat icon="fas fa-trophy" label="Победы" value={formatNumber(profile.wins)} />
                                <HeroStat icon="fas fa-gamepad" label="Матчи" value={formatNumber(profile.totalMatches)} />
                                <HeroStat icon="fas fa-fire" label="Solo" value={formatNumber(profile.bestSoloScore)} />
                            </div>
                        </section>
                    </GlowEffect>

                    <div className="profile-main-grid">
                        <GlowEffect className="profile-panel-glow">
                            <section className="profile-panel" id="profile-stats">
                                <PanelHeader title="Основная статистика" />
                                <div className="profile-stat-grid">
                                    {stats.map((stat) => (
                                        <article key={stat.key} className="profile-stat-tile">
                                            <span className="profile-stat-tile__icon"><i className={stat.icon}></i></span>
                                            <div>
                                                <span>{stat.label}</span>
                                                <strong>{stat.value}</strong>
                                                <small>{stat.note}</small>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            </section>
                        </GlowEffect>

                        <GlowEffect className="profile-panel-glow">
                            <section className="profile-panel profile-panel--matches">
                                <PanelHeader title="История матчей" action={<Link to="/matches">Смотреть все</Link>} />
                                <div className="profile-match-list">
                                    {matchHistory.length > 0 ? (
                                        matchHistory.map((match) => (
                                            <MatchRow key={match.id} match={match} />
                                        ))
                                    ) : (
                                        <div className="profile-empty">
                                            <i className="fas fa-folder-open"></i>
                                            <strong>Матчей пока нет</strong>
                                            <span>История появится после первой игры.</span>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </GlowEffect>
                    </div>

                    <GlowEffect className="profile-panel-glow">
                        <section className="profile-panel profile-quick-settings-panel">
                            <PanelHeader
                                title="Быстрые настройки"
                                action={<Link to="/account-settings">Все настройки</Link>}
                            />
                            <div className="profile-quick-settings-grid">
                                <button
                                    type="button"
                                    className="profile-settings-toggle"
                                    aria-pressed={isDarkTheme}
                                    onClick={toggleTheme}
                                >
                                    <span className="profile-settings-toggle__icon"><i className="fas fa-moon"></i></span>
                                    <span>
                                        <strong>Тёмная тема</strong>
                                        <small>Оформление интерфейса</small>
                                    </span>
                                    <AppSwitch checked={isDarkTheme} />
                                </button>
                                <button
                                    type="button"
                                    className="profile-settings-toggle"
                                    aria-pressed={isGlowEffectEnabled}
                                    onClick={toggleGlowEffect}
                                >
                                    <span className="profile-settings-toggle__icon"><i className="fas fa-wand-magic-sparkles"></i></span>
                                    <span>
                                        <strong>Подсветка курсора</strong>
                                        <small>Glow effect на панелях</small>
                                    </span>
                                    <AppSwitch checked={isGlowEffectEnabled} />
                                </button>
                            </div>
                        </section>
                    </GlowEffect>

                    <GlowEffect className="profile-panel-glow">
                        <section className="profile-panel profile-account-panel">
                            <PanelHeader title="Аккаунт" />
                            <div className="profile-account-grid">
                                <InfoLine label="Email" value={profile.email || 'Не указан'} icon="fas fa-envelope" />
                                <InfoLine label="Последний вход" value={profile.lastLogin} icon="fas fa-clock" />
                                <InfoLine label="Статус" value={formatStatus(profile.status)} icon="fas fa-shield-halved" />
                                <button type="button" className="profile-logout" onClick={handleLogout}>
                                    <i className="fas fa-right-from-bracket"></i>
                                    Выйти
                                </button>
                            </div>
                        </section>
                    </GlowEffect>
                </div>
            </div>
        </section>
    )
}

const PanelHeader = ({ title, action = null }) => (
    <header className="profile-panel__header">
        <h2>{title}</h2>
        {action}
    </header>
)

const HeroStat = ({ icon, label, value }) => (
    <article className="profile-hero-stat">
        <i className={icon}></i>
        <div>
            <span>{label}</span>
            <strong>{value}</strong>
        </div>
    </article>
)

const MatchRow = ({ match }) => {
    const result = match.result === 'win' ? 'win' : 'loss'
    const score = `${Number(match.score) || 0}:${Number(match.opponentScore) || Number(match.opponentTeamScore) || 0}`

    return (
        <Link to={`/matches/${match.id}`} className={`profile-match-row profile-match-row--${getMatchResultClass(result)}`}>
            <div>
                <strong>{formatMatchResultLabel(result)}</strong>
                <span>vs {match.opponent || 'Неизвестный соперник'}</span>
            </div>
            <span>{getMatchModeLabel(match.mode)}</span>
            <div>
                <strong>{score}</strong>
                <span>{formatMatchDate(match.playedAt)}</span>
            </div>
        </Link>
    )
}

const InfoLine = ({ icon, label, value }) => (
    <div className="profile-info-line">
        <i className={icon}></i>
        <span>{label}</span>
        <strong>{value}</strong>
    </div>
)

const normalizeRankKey = (value) => {
    const normalized = String(value || '').toLowerCase().trim()

    if (normalized.includes('legend')) return 'legend'
    if (normalized.includes('master')) return 'master'
    if (normalized.includes('diamond')) return 'diamond'
    if (normalized.includes('platinum')) return 'platinum'
    if (normalized.includes('gold')) return 'gold'
    if (normalized.includes('silver')) return 'silver'

    return 'bronze'
}

const formatNumber = (value) => new Intl.NumberFormat('ru-RU').format(Number(value) || 0)

const formatStatus = (status) => {
    if (status === 'active') return 'Активен'
    if (status === 'pending_verification') return 'Ожидает подтверждения'

    return status || 'Активен'
}

const formatMemberSince = (value) => {
    const date = parseDate(value)

    if (!date) {
        return { short: '0 дн.', full: 'нет данных' }
    }

    const days = Math.max(1, Math.floor((Date.now() - date.getTime()) / 86400000))

    return {
        short: `${days} дн.`,
        full: new Intl.DateTimeFormat('ru-RU', {
            month: 'long',
            year: 'numeric',
        }).format(date),
    }
}

const formatLastLogin = (value) => {
    const date = parseDate(value)

    if (!date) {
        return 'Нет данных'
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

const parseDate = (value) => {
    if (!value) {
        return null
    }

    const date = new Date(value)

    return Number.isNaN(date.getTime()) ? null : date
}

export default ProfilePage
