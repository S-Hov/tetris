import { getPublicStatsRepo } from '../repositories/publicStatsRepository.js'
import { getActiveUsersCount } from '../sockets/presenceStats.js'

export const PUBLIC_STATS_PERIOD_DAYS = 30
const PUBLIC_STATS_CACHE_TTL_MS = 30_000
let cachedStats = null
let cachedStatsLoadedAt = 0
let statsPromise = null

const getCachedPublicStats = async () => {
    if (cachedStats && Date.now() - cachedStatsLoadedAt < PUBLIC_STATS_CACHE_TTL_MS) {
        return cachedStats
    }

    if (!statsPromise) {
        statsPromise = getPublicStatsRepo({
            periodDays: PUBLIC_STATS_PERIOD_DAYS,
        }).then((stats) => {
            cachedStats = stats
            cachedStatsLoadedAt = Date.now()
            return stats
        }).finally(() => {
            statsPromise = null
        })
    }

    return await statsPromise
}

export const getPublicStatsService = async () => {
    const stats = await getCachedPublicStats()

    return {
        activeUsers: getActiveUsersCount(),
        matchesLast30Days: Number(stats?.recent_matches) || 0,
        ratingPlayers: Number(stats?.rating_players) || 0,
        arenaRecord: Number(stats?.arena_record) || 0,
        totalMatches: Number(stats?.total_matches) || 0,
        periodDays: PUBLIC_STATS_PERIOD_DAYS,
    }
}
