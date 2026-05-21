import { getLeaderboardRepo } from '../repositories/leaderboardRepository.js'
import { getRankTier } from './rankRules.js'

const ALLOWED_PERIODS = new Set(['all', 'month', 'week'])
const ALLOWED_SORTS = new Set(['rating', 'wins', 'winRate', 'games', 'mmr', 'bestSolo'])

export const getLeaderboardService = async ({ period, sort, limit }) => {
    const normalizedPeriod = ALLOWED_PERIODS.has(period) ? period : 'all'
    const normalizedSort = ALLOWED_SORTS.has(sort) ? sort : 'rating'

    const players = await getLeaderboardRepo({
        sort: normalizedSort,
        limit: toPositiveInteger(limit, 50),
    })

    return {
        period: normalizedPeriod,
        sort: normalizedSort,
        players: players.map((player) => ({
            rank: Number(player.rank) || 0,
            id: player.id,
            username: player.username || player.email?.split('@')[0] || 'Игрок',
            avatar: getAvatarLabel(player.username || player.email),
            avatarUrl: player.avatar_url || null,
            totalGames: Number(player.total_matches) || 0,
            wins: Number(player.wins) || 0,
            losses: Number(player.losses) || 0,
            draws: Number(player.draws) || 0,
            winRate: Number(player.win_rate) || 0,
            rating: Number(player.rank_points) || 0,
            rankPoints: Number(player.rank_points) || 0,
            mmr: Number(player.mmr) || 1000,
            bestSoloScore: Number(player.best_solo_score) || 0,
            rankTier: getRankTier(player.rank_points),
            lastPlayedAt: player.last_played_at,
            memberSince: player.created_at,
        })),
    }
}

const toPositiveInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10)

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return fallback
    }

    return parsed
}

const getAvatarLabel = (value = '') => {
    const normalized = String(value).trim()

    if (!normalized) {
        return '??'
    }

    return normalized
        .replace(/@.*/, '')
        .split(/[\s._-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
        .padEnd(2, normalized[0]?.toUpperCase() || '?')
        .slice(0, 2)
}
