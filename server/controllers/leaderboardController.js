import { asyncHandler } from '../utils/asyncHandler.js'
import { getLeaderboardService } from '../services/leaderboardService.js'

export const getLeaderboard = asyncHandler(async (req, res) => {
    const data = await getLeaderboardService({
        period: req.query.period,
        sort: req.query.sort,
        limit: req.query.limit,
    })

    res.json({
        success: true,
        message: 'Мировой рейтинг получен',
        data,
    })
})
