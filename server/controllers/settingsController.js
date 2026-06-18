import { asyncHandler } from '../utils/asyncHandler.js'
import {
    getConnectionsService,
    unlinkConnectionService,
} from '../services/oauthService.js'
import {
    createAuthLogService,
    getLoginHistoryService,
    requestAccountEmailChangeService,
} from '../services/authService.js'
import { sendVerificationEmail } from '../services/emailService.js'
import { getAuthCookieOptions } from '../utils/authCookie.js'
import {
    getPrivacySettingsService,
    updatePrivacySettingsService,
} from '../services/privacyService.js'
import { ok } from '../src/shared/responses/send.js'

const getRequestMeta = (req) => ({
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
})

export const getConnections = asyncHandler(async (req, res) => {
    const connections = await getConnectionsService(req.user.id)

    res.json({
        success: true,
        message: 'Connections fetched successfully',
        data: connections,
    })
})

export const unlinkConnection = asyncHandler(async (req, res) => {
    const connections = await unlinkConnectionService({
        userId: req.user.id,
        provider: req.params.provider,
    })

    res.json({
        success: true,
        message: 'Подключение удалено',
        data: connections,
    })
})

export const requestAccountEmailChange = asyncHandler(async (req, res) => {
    const { user, verificationCode } = await requestAccountEmailChangeService({
        userId: req.user.id,
        nextEmail: req.body.email,
    })

    try {
        await sendVerificationEmail(user.email, verificationCode)
    } catch (error) {
        console.error('Email send error:', error)
    }

    await createAuthLogService({
        userId: req.user.id,
        eventType: 'account_email_change_requested',
        ...getRequestMeta(req),
    })

    res.clearCookie('token', getAuthCookieOptions())

    res.json({
        success: true,
        message: 'Почта обновлена. Новый код отправлен',
        data: {
            email: user.email,
            redirectTo: `/verify-email/${encodeURIComponent(user.email)}`,
        },
    })
})

export const getLoginHistory = asyncHandler(async (req, res) => {
    const history = await getLoginHistoryService(req.user.id, 5)

    res.json({
        success: true,
        message: 'Login history fetched successfully',
        data: {
            history,
        },
    })
})

export const getPrivacySettings = asyncHandler(async (req, res) => {
    const settings = await getPrivacySettingsService(req.user.id)

    return ok(res, req, 'PRIVACY.LOADED', {
        data: { settings },
    })
})

export const updatePrivacySettings = asyncHandler(async (req, res) => {
    const settings = await updatePrivacySettingsService({
        userId: req.user.id,
        updates: req.body,
    })

    return ok(res, req, 'PRIVACY.UPDATED', {
        data: { settings },
    })
})
