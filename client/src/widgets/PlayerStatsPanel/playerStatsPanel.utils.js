import { rankImages } from './playerStatsPanel.config.js'

export const formatNumber = (value, language) => new Intl.NumberFormat(language === 'en' ? 'en-US' : 'ru-RU').format(Number(value) || 0)

export const getAssetUrl = (value) => {
    if (!value) return ''
    if (/^https?:\/\//i.test(value)) return value

    const baseUrl = import.meta.env.VITE_API_URL || (
        typeof window !== 'undefined' && window.location.hostname
            ? `http://${window.location.hostname}:8880`
            : 'http://127.0.0.1:8880'
    )

    return `${baseUrl}${value}`
}

export const getRankImage = (rank) => {
    const imageUrl = getAssetUrl(rank?.imageUrl)

    return imageUrl || rankImages[rank?.key] || rankImages.bronze
}

export const buildPlayerStats = (user) => {
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
}
