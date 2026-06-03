import { DEFAULT_LANGUAGE } from '@/i18n'
import { getMatchResultClass } from '@/shared/lib/matches/presentation.js'

import { RANK_ASSETS } from './profilePage.config.js'

export const buildProfile = ({ currentLanguage, t, user }) => {
    const rankStats = user?.rankStats || {}
    const rank = rankStats.rank || {}
    const rankName = rank.label || rank.label_ru || t('home.dashboard.fallbackRank')
    const rankKey = normalizeRankKey(rank.key || rankName)
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
        rankAssets: RANK_ASSETS[rankKey] || RANK_ASSETS.bronze,
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
}

export const buildProfileStats = ({ currentLanguage, profile, t }) => ([
    { key: 'mmr', label: 'MMR', value: formatNumber(profile.rankPoints, currentLanguage), note: t('profile.stats.hiddenMmr', { value: profile.mmr }), icon: 'fas fa-gem' },
    { key: 'wins', label: t('profile.stats.wins'), value: formatNumber(profile.wins, currentLanguage), note: t('profile.stats.losses', { value: formatNumber(profile.losses, currentLanguage) }), icon: 'fas fa-trophy' },
    { key: 'winRate', label: t('profile.stats.winRate'), value: `${profile.winRate}%`, note: t('profile.stats.matches', { value: formatNumber(profile.totalMatches, currentLanguage) }), icon: 'fas fa-chart-pie' },
    { key: 'solo', label: t('profile.stats.soloRecord'), value: formatNumber(profile.bestSoloScore, currentLanguage), note: t('profile.stats.draws', { value: formatNumber(profile.draws, currentLanguage) }), icon: 'fas fa-star' },
    { key: 'member', label: t('profile.stats.member'), value: profile.memberSince.short, note: profile.memberSince.full, icon: 'fas fa-calendar' },
    { key: 'id', label: t('profile.stats.playerId'), value: profile.id ? `#${profile.id}` : '-', note: formatStatus(profile.status, t), icon: 'fas fa-fingerprint' },
])

export const getProfileMatchData = (match, t) => {
    const result = match.result === 'win' ? 'win' : 'loss'
    const score = `${Number(match.score) || 0}:${Number(match.opponentScore) || Number(match.opponentTeamScore) || 0}`

    return {
        result,
        resultClass: getMatchResultClass(result),
        score,
        opponent: match.opponent || t('profile.common.unknownOpponent'),
        resultLabel: result === 'win' ? t('profile.common.win') : t('profile.common.loss'),
        modeLabel: getProfileMatchModeLabel(match.mode, t),
    }
}

export const getProfileMatchModeLabel = (mode, t) => {
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

export const normalizeRankKey = (value) => {
    const normalized = String(value || '').toLowerCase().trim()

    if (normalized.includes('legend')) return 'legend'
    if (normalized.includes('master')) return 'master'
    if (normalized.includes('diamond')) return 'diamond'
    if (normalized.includes('platinum')) return 'platinum'
    if (normalized.includes('gold')) return 'gold'
    if (normalized.includes('silver')) return 'silver'

    return 'bronze'
}

export const formatNumber = (value, lang = DEFAULT_LANGUAGE) => new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ru-RU').format(Number(value) || 0)

export const formatStatus = (status, t) => {
    if (status === 'active') return t('profile.common.active')
    if (status === 'pending_verification') return t('profile.common.pendingVerification')

    return status || t('profile.common.active')
}

export const formatMemberSince = (value, lang, t) => {
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

export const formatLastLogin = (value, lang, t) => formatDateTime(value, lang, t)

export const formatDateTime = (value, lang, t) => {
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

export const parseDate = (value) => {
    if (!value) {
        return null
    }

    const date = new Date(value)

    return Number.isNaN(date.getTime()) ? null : date
}
