import { identityApplication } from '../../application/identityApplication.js'
import { asyncHandler } from '../../../../shared/presentation/http/asyncHandler.js'
import { logger } from '../../../../shared/infrastructure/logging/logger.js'
import { identityPresentationPorts } from '../identityPresentationPorts.js'
import { getAuthCookieOptions } from './sessionCookies.js'

const getRequestMeta = (req) => ({
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
})

export const getConnections = asyncHandler(async (req, res) => {
    const connections = await identityApplication.getConnections(req.user.id)
    res.json({ success: true, message: 'Connections fetched successfully', data: connections })
})

export const unlinkConnection = asyncHandler(async (req, res) => {
    const connections = await identityApplication.unlinkConnection({
        userId: req.user.id,
        provider: req.params.provider,
    })
    res.json({ success: true, message: 'Подключение удалено', data: connections })
})

export const requestAccountEmailChange = asyncHandler(async (req, res) => {
    const { user, verificationCode } = await identityApplication.requestAccountEmailChange({
        userId: req.user.id,
        nextEmail: req.body.email,
    })

    try {
        await identityPresentationPorts.sendVerificationEmail(user.email, verificationCode)
    } catch (error) {
        logger.error('identity_account_email_send_failed', { error, userId: req.user.id })
    }

    await identityApplication.createAuthLog({
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
    const history = await identityApplication.getLoginHistory(req.user.id, 5)
    res.json({
        success: true,
        message: 'Login history fetched successfully',
        data: { history },
    })
})
