import { useEffect, useMemo } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import AppSwitch from '@/shared/ui/AppSwitch'
import GlowEffect from '@/shared/ui/GlowEffect'
import InterfaceLanguageSelect from '@/shared/ui/InterfaceLanguageSelect'
import ProfileSideNav from '@/widgets/ProfileSideNav'
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/i18n'
import { useAuth } from '@/shared/hooks/useAuth'
import { useGlowEffect } from '@/shared/hooks/useGlowEffect.js'
import { useTheme } from '@/shared/hooks/useTheme.js'
import { getMatchResultClass } from '@/shared/lib/matches/presentation.js'
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

const SITE_URL = 'https://www.pvp-tetris.online'

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
    const { lang } = useParams()
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()
    const { checkAuth, logout, user } = useAuth()
    const { isGlowEffectEnabled, toggleGlowEffect } = useGlowEffect()
    const { isDarkTheme, toggleTheme } = useTheme()
    const isSupportedLanguage = SUPPORTED_LANGUAGES.includes(lang)
    const currentLanguage = isSupportedLanguage ? lang : DEFAULT_LANGUAGE

    useEffect(() => {
        if (i18n.language !== currentLanguage) {
            i18n.changeLanguage(currentLanguage)
        }
    }, [currentLanguage, i18n])

    useEffect(() => {
        checkAuth({ silent: true })
    }, [checkAuth])

    const profile = useMemo(() => {
        const rankStats = user?.rankStats || {}
        const rank = rankStats.rank || {}
        const rankName = rank.label || rank.label_ru || t('home.dashboard.fallbackRank')
        const rankKey = normalizeRankKey(rank.key || rankName)
        const rankAssets = RANK_ASSETS[rankKey] || RANK_ASSETS.bronze
        const totalMatches = Number(rankStats.totalMatches ?? user?.stats?.totalGames) || 0
        const wins = Number(rankStats.wins) || 0
        const losses = Number(rankStats.losses) || 0
        const draws = Number(rankStats.draws) || 0
        const winRate = totalMatches > 0 ? ((wins / totalMatches) * 100).toFixed(1) : '0.0'

        return {
            id: user?.id,
            name: user?.username || user?.email?.split('@')[0] || t('profile.common.playerFallback'),
            email: user?.email || '',
            status: user?.status || 'active',
            memberSince: formatMemberSince(user?.created_at || user?.createdAt, currentLanguage, t),
            lastLogin: formatLastLogin(user?.last_login_at || user?.lastLoginAt, currentLanguage, t),
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
    }, [currentLanguage, t, user])

    const stats = useMemo(() => ([
        { key: 'mmr', label: 'MMR', value: formatNumber(profile.rankPoints, currentLanguage), note: t('profile.stats.hiddenMmr', { value: profile.mmr }), icon: 'fas fa-gem' },
        { key: 'wins', label: t('profile.stats.wins'), value: formatNumber(profile.wins, currentLanguage), note: t('profile.stats.losses', { value: formatNumber(profile.losses, currentLanguage) }), icon: 'fas fa-trophy' },
        { key: 'winRate', label: t('profile.stats.winRate'), value: `${profile.winRate}%`, note: t('profile.stats.matches', { value: formatNumber(profile.totalMatches, currentLanguage) }), icon: 'fas fa-chart-pie' },
        { key: 'solo', label: t('profile.stats.soloRecord'), value: formatNumber(profile.bestSoloScore, currentLanguage), note: t('profile.stats.draws', { value: formatNumber(profile.draws, currentLanguage) }), icon: 'fas fa-star' },
        { key: 'member', label: t('profile.stats.member'), value: profile.memberSince.short, note: profile.memberSince.full, icon: 'fas fa-calendar' },
        { key: 'id', label: t('profile.stats.playerId'), value: profile.id ? `#${profile.id}` : '-', note: formatStatus(profile.status, t), icon: 'fas fa-fingerprint' },
    ]), [currentLanguage, profile, t])

    const matchHistory = useMemo(() => profile.recentMatches.slice(0, 6), [profile.recentMatches])

    const handleLogout = async () => {
        await logout()
        navigate('/login', { replace: true })
    }

    if (!isSupportedLanguage) {
        return <Navigate to={`/${DEFAULT_LANGUAGE}/profile`} replace />
    }

    return (
        <section className="section profile-page">
            <Helmet htmlAttributes={{ lang: currentLanguage }}>
                <title>{t('profile.seo.title')}</title>
                <meta name="description" content={t('profile.seo.description')} />
                <meta property="og:title" content={t('profile.seo.ogTitle')} />
                <meta property="og:description" content={t('profile.seo.ogDescription')} />
                <meta property="og:type" content="website" />
                <link rel="canonical" href={`${SITE_URL}/${currentLanguage}/profile`} />
                <link rel="alternate" hrefLang="ru" href={`${SITE_URL}/ru/profile`} />
                <link rel="alternate" hrefLang="en" href={`${SITE_URL}/en/profile`} />
                <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/ru/profile`} />
            </Helmet>

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
                                    <Link className="profile-edit-link" to="/account-settings" aria-label={t('profile.hero.editAria')}>
                                        <i className="fas fa-pen"></i>
                                    </Link>
                                </div>
                                <div className="profile-hero__rating">
                                    <i className="fas fa-trophy"></i>
                                    <strong>{formatNumber(profile.rankPoints, currentLanguage)}</strong>
                                    <span>MMR</span>
                                </div>
                                <div className="profile-hero__meta">
                                    <span><i className="fas fa-calendar"></i>{t('profile.hero.memberSince', { date: profile.memberSince.full })}</span>
                                    <span><i className="fas fa-id-card"></i>ID: {profile.id || '-'}</span>
                                </div>
                            </div>

                            <div className="profile-season-card" style={{ '--profile-rank-frame': `url(${profile.rankAssets.frame})` }}>
                                <span>{t('profile.hero.season')}</span>
                                <strong>{profile.rankName}</strong>
                            </div>

                            <div className="profile-hero-stats" aria-label={t('profile.hero.statsAria')}>
                                <HeroStat icon="fas fa-chart-line" label={t('profile.hero.winRate')} value={`${profile.winRate}%`} />
                                <HeroStat icon="fas fa-trophy" label={t('profile.hero.wins')} value={formatNumber(profile.wins, currentLanguage)} />
                                <HeroStat icon="fas fa-gamepad" label={t('profile.hero.matches')} value={formatNumber(profile.totalMatches, currentLanguage)} />
                                <HeroStat icon="fas fa-fire" label={t('profile.hero.solo')} value={formatNumber(profile.bestSoloScore, currentLanguage)} />
                            </div>
                        </section>
                    </GlowEffect>

                    <div className="profile-main-grid">
                        <GlowEffect className="profile-panel-glow">
                            <section className="profile-panel" id="profile-stats">
                                <PanelHeader title={t('profile.stats.title')} />
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
                                <PanelHeader title={t('profile.matches.title')} action={<Link to="/matches">{t('profile.matches.viewAll')}</Link>} />
                                <div className="profile-match-list">
                                    {matchHistory.length > 0 ? (
                                        matchHistory.map((match) => (
                                            <MatchRow key={match.id} match={match} lang={currentLanguage} t={t} />
                                        ))
                                    ) : (
                                        <div className="profile-empty">
                                            <i className="fas fa-folder-open"></i>
                                            <strong>{t('profile.matches.emptyTitle')}</strong>
                                            <span>{t('profile.matches.emptyText')}</span>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </GlowEffect>
                    </div>

                    <GlowEffect className="profile-panel-glow">
                        <section className="profile-panel profile-quick-settings-panel">
                            <PanelHeader
                                title={t('profile.settings.title')}
                                action={<Link to="/account-settings">{t('profile.settings.all')}</Link>}
                            />
                            <div className="profile-quick-settings-grid">
                                <div className="profile-settings-toggle profile-language-setting">
                                    <span className="profile-settings-toggle__icon"><i className="fas fa-language"></i></span>
                                    <span>
                                        <strong>{t('profile.settings.language')}</strong>
                                        <small>{t('profile.settings.languageDescription')}</small>
                                    </span>
                                    <InterfaceLanguageSelect className="profile-language-select" />
                                </div>
                                <button
                                    type="button"
                                    className="profile-settings-toggle"
                                    aria-pressed={isDarkTheme}
                                    onClick={toggleTheme}
                                >
                                    <span className="profile-settings-toggle__icon"><i className="fas fa-moon"></i></span>
                                    <span>
                                        <strong>{t('profile.settings.darkTheme')}</strong>
                                        <small>{t('profile.settings.darkThemeDescription')}</small>
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
                                        <strong>{t('profile.settings.glow')}</strong>
                                        <small>{t('profile.settings.glowDescription')}</small>
                                    </span>
                                    <AppSwitch checked={isGlowEffectEnabled} />
                                </button>
                            </div>
                        </section>
                    </GlowEffect>

                    <GlowEffect className="profile-panel-glow">
                        <section className="profile-panel profile-account-panel">
                            <PanelHeader title={t('profile.account.title')} />
                            <div className="profile-account-grid">
                                <InfoLine label={t('profile.account.email')} value={profile.email || t('profile.common.notSpecified')} icon="fas fa-envelope" />
                                <InfoLine label={t('profile.account.lastLogin')} value={profile.lastLogin} icon="fas fa-clock" />
                                <InfoLine label={t('profile.account.status')} value={formatStatus(profile.status, t)} icon="fas fa-shield-halved" />
                                <button type="button" className="profile-logout" onClick={handleLogout}>
                                    <i className="fas fa-right-from-bracket"></i>
                                    {t('profile.account.logout')}
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

const MatchRow = ({ match, lang, t }) => {
    const result = match.result === 'win' ? 'win' : 'loss'
    const score = `${Number(match.score) || 0}:${Number(match.opponentScore) || Number(match.opponentTeamScore) || 0}`

    return (
        <Link to={`/matches/${match.id}`} className={`profile-match-row profile-match-row--${getMatchResultClass(result)}`}>
            <div>
                <strong>{result === 'win' ? t('profile.common.win') : t('profile.common.loss')}</strong>
                <span>vs {match.opponent || t('profile.common.unknownOpponent')}</span>
            </div>
            <span>{getProfileMatchModeLabel(match.mode, t)}</span>
            <div>
                <strong>{score}</strong>
                <span>{formatDateTime(match.playedAt, lang, t)}</span>
            </div>
        </Link>
    )
}

const getProfileMatchModeLabel = (mode, t) => {
    switch (mode) {
        case 'solo':
            return 'Solo'
        case '1v1':
            return '1 VS 1'
        case '2v2':
            return '2 VS 2'
        case '5v5':
            return '5 VS 5'
        case 'royale':
            return 'Royale'
        default:
            return mode || t('profile.common.match')
    }
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

const formatNumber = (value, lang = DEFAULT_LANGUAGE) => new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ru-RU').format(Number(value) || 0)

const formatStatus = (status, t) => {
    if (status === 'active') return t('profile.common.active')
    if (status === 'pending_verification') return t('profile.common.pendingVerification')

    return status || t('profile.common.active')
}

const formatMemberSince = (value, lang, t) => {
    const date = parseDate(value)

    if (!date) {
        return { short: `0 ${t('profile.common.dayShort')}`, full: t('profile.common.noData') }
    }

    const days = Math.max(1, Math.floor((Date.now() - date.getTime()) / 86400000))

    return {
        short: `${formatNumber(days, lang)} ${t('profile.common.dayShort')}`,
        full: new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ru-RU', {
            month: 'long',
            year: 'numeric',
        }).format(date),
    }
}

const formatLastLogin = (value, lang, t) => formatDateTime(value, lang, t)

const formatDateTime = (value, lang, t) => {
    const date = parseDate(value)

    if (!date) {
        return t('profile.common.noData')
    }

    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ru-RU', {
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
