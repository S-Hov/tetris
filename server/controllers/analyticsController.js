import { optionalAuth } from '../middleware/checkAuth.js'
import {
    isAnalyticsTransientDbError,
    trackPageViewRepo,
} from '../repositories/analyticsRepository.js'
import { getPublicStatsService } from '../services/publicStatsService.js'
import { ok } from '../src/shared/responses/send.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const analyticsAuth = optionalAuth

export const getPublicStats = asyncHandler(async (req, res) => {
    const data = await getPublicStatsService()

    return ok(res, req, 'ANALYTICS.PUBLIC_STATS_LOADED', {
        data,
    })
})

export const trackPageView = asyncHandler(async (req, res) => {
    let data = null
    let skipped = false

    try {
        data = await trackPageViewRepo({
            userId: req.user?.id,
            sessionKey: req.body?.sessionKey,
            path: req.body?.path,
            referrer: req.body?.referrer,
            source: req.body?.source,
            deviceType: req.body?.deviceType,
            ipAddress: req.ip,
            userAgent: req.get('user-agent'),
            metadata: {
                title: req.body?.title || null,
                screen: req.body?.screen || null,
            },
        })
    } catch (error) {
        if (!isAnalyticsTransientDbError(error)) {
            throw error
        }

        skipped = true
        console.warn('page-view analytics skipped:', error.message)
    }

    res.json({
        success: true,
        message: skipped ? 'Page view tracking skipped' : 'Page view tracked',
        data,
    })
})
