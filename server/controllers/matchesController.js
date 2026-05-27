import { asyncHandler } from '../utils/asyncHandler.js'
import {
    getUserMatchDetailsService,
    getUserMatchesService,
    getUserSoloRecordService,
    submitSoloResultService,
} from '../services/userMatchesService.js'
import { ok } from '../src/shared/responses/send.js'

export const getUserMatches = asyncHandler(async (req, res) => {
    const data = await getUserMatchesService({
        userId: req.user.id,
        page: req.query.page,
        limit: req.query.limit,
        result: req.query.result,
        mode: req.query.mode,
        search: req.query.search,
    })

    return ok(res, req, 'MATCH.LIST_LOADED', {
        data,
    })
})

export const getUserMatchDetails = asyncHandler(async (req, res) => {
    const data = await getUserMatchDetailsService({
        userId: req.user.id,
        matchId: req.params.matchId,
    })

    return ok(res, req, 'MATCH.DETAILS_LOADED', {
        data,
    })
})

export const getUserSoloRecord = asyncHandler(async (req, res) => {
    const data = await getUserSoloRecordService({
        userId: req.user.id,
    })

    return ok(res, req, 'MATCH.SOLO_RECORD_LOADED', {
        data,
    })
})

export const submitSoloResult = asyncHandler(async (req, res) => {
    const data = await submitSoloResultService({
        user: req.user,
        stats: req.body,
    })

    return ok(res, req, data.isNewRecord ? 'MATCH.SOLO_RECORD_SAVED' : 'MATCH.SOLO_RESULT_SKIPPED', {
        data,
    })
})
