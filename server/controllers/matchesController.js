import { asyncHandler } from '../utils/asyncHandler.js'
import {
    getUserMatchDetailsService,
    getUserMatchesService,
    getUserSoloRecordService,
    submitSoloResultService,
} from '../services/userMatchesService.js'

export const getUserMatches = asyncHandler(async (req, res) => {
    const data = await getUserMatchesService({
        userId: req.user.id,
        page: req.query.page,
        limit: req.query.limit,
        result: req.query.result,
        mode: req.query.mode,
        search: req.query.search,
    })

    res.json({
        success: true,
        message: 'Список матчей получен',
        data,
    })
})

export const getUserMatchDetails = asyncHandler(async (req, res) => {
    const data = await getUserMatchDetailsService({
        userId: req.user.id,
        matchId: req.params.matchId,
    })

    res.json({
        success: true,
        message: 'Детали матча получены',
        data,
    })
})

export const getUserSoloRecord = asyncHandler(async (req, res) => {
    const data = await getUserSoloRecordService({
        userId: req.user.id,
    })

    res.json({
        success: true,
        message: 'Solo record loaded',
        data,
    })
})

export const submitSoloResult = asyncHandler(async (req, res) => {
    const data = await submitSoloResultService({
        user: req.user,
        stats: req.body,
    })

    res.json({
        success: true,
        message: data.isNewRecord ? 'Solo record saved' : 'Solo result skipped',
        data,
    })
})
