import { optionalAuth } from '../middleware/checkAuth.js'
import { trackPageViewRepo } from '../repositories/analyticsRepository.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const analyticsAuth = optionalAuth

export const trackPageView = asyncHandler(async (req, res) => {
    const data = await trackPageViewRepo({
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

    res.json({
        success: true,
        message: 'Page view tracked',
        data,
    })
})
