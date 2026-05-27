import { asyncHandler } from '../utils/asyncHandler.js'
import { getLeaderboardService } from '../services/leaderboardService.js'
import { ok } from '../src/shared/responses/send.js'

export const getLeaderboard = asyncHandler(async (req, res) => {
    const data = await getLeaderboardService({
        period: req.query.period,
        sort: req.query.sort,
        limit: req.query.limit,
    })

    return ok(res, req, 'LEADERBOARD.LOADED', {
        data,
    })
})
