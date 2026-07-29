import { badRequest } from '../../../../shared/responses/errors.js'
import { asyncHandler } from '../../../../shared/presentation/http/asyncHandler.js'
import { logger } from '../../../../shared/infrastructure/logging/logger.js'
import { setAuthCookie } from './sessionCookies.js'
import {
    createOAuthState,
    getOAuthStateCookieName,
    getOAuthStateCookieOptions,
    verifyOAuthState,
} from '../../application/oauthState.js'
import {
    OAUTH_PROVIDER_LABELS,
    isOAuthProviderEnabled,
    isSupportedOAuthProvider,
    resolveClientRedirectUrl,
} from '../../infrastructure/oauth/oauthProviders.js'
import { identityApplication } from '../../application/identityApplication.js'
import { identityPresentationPorts } from '../identityPresentationPorts.js'

const {
    createAuthLog: createAuthLogService,
    handleOAuthLogin: handleOAuthLoginService,
} = identityApplication

const getRequestMeta = (req) => ({
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
})

const safeCreateAuthLog = async (payload) => {
    try {
        await createAuthLogService(payload)
    } catch (error) {
        logger.error('identity_oauth_auth_log_failed', { error, userId: payload.userId })
    }
}

const AUTHENTICATE_OPTIONS = {
    google: {
        scope: ['profile', 'email'],
        prompt: 'select_account',
    },
    discord: {
        scope: ['identify', 'email'],
    },
    steam: {},
    yandex: {
        scope: ['login:email', 'login:info'],
    },
    vk: {
        scope: ['email'],
    },
    github: {
        scope: ['user:email'],
    },
}

const ensureProviderReady = (provider) => {
    if (!isSupportedOAuthProvider(provider)) {
        throw badRequest('Неподдерживаемый OAuth провайдер')
    }

    if (!isOAuthProviderEnabled(provider)) {
        throw badRequest(`OAuth провайдер ${OAUTH_PROVIDER_LABELS[provider]} не настроен`)
    }
}

const startOAuth = ({ mode = 'login' } = {}) => asyncHandler(async (req, res, next) => {
    const { provider } = req.params

    ensureProviderReady(provider)

    if (mode === 'link' && !req.user?.id) {
        throw badRequest('Для привязки внешнего аккаунта нужно войти')
    }

    const state = createOAuthState({
        provider,
        mode,
        userId: mode === 'link' ? req.user.id : null,
        returnTo: req.query.returnTo || req.body?.returnTo || null,
    })

    res.cookie(
        getOAuthStateCookieName(provider),
        state,
        getOAuthStateCookieOptions()
    )

    identityPresentationPorts.authenticateOAuth(provider, {
        session: false,
        state,
        ...(AUTHENTICATE_OPTIONS[provider] || {}),
    })(req, res, next)
})

export const startOAuthLogin = startOAuth({ mode: 'login' })

export const startOAuthLink = startOAuth({ mode: 'link' })

export const handleOAuthCallback = asyncHandler(async (req, res, next) => {
    const { provider } = req.params

    ensureProviderReady(provider)

    const cookieName = getOAuthStateCookieName(provider)
    const cookieState = req.cookies[cookieName]
    const callbackState = req.query.state || (provider === 'steam' ? cookieState : null)
    const redirectWithError = (message) => {
        const redirectUrl = resolveClientRedirectUrl(
            `/login?oauthError=${encodeURIComponent(message)}`,
            '/login'
        )

        res.clearCookie(cookieName, getOAuthStateCookieOptions())
        return res.redirect(redirectUrl)
    }

    let statePayload

    try {
        statePayload = verifyOAuthState({
            provider,
            state: callbackState,
            cookieState,
        })
    } catch {
        return redirectWithError('OAuth state is invalid or expired')
    }

    identityPresentationPorts.authenticateOAuth(provider, {
        session: false,
    }, async (error, oauthProfile, info) => {
        res.clearCookie(cookieName, getOAuthStateCookieOptions())

        if (error || !oauthProfile) {
            const message = info?.message || error?.message || 'OAuth login failed'
            return redirectWithError(message)
        }

        try {
            const result = await handleOAuthLoginService({
                provider,
                oauthProfile,
                mode: statePayload.mode,
                userId: statePayload.userId,
            })
            const eventType = statePayload.mode === 'link'
                ? 'oauth_link_success'
                : 'oauth_login_success'

            await safeCreateAuthLog({
                userId: result.user.id,
                eventType,
                ...getRequestMeta(req),
            })

            setAuthCookie(res, result.user)

            return res.redirect(resolveClientRedirectUrl(
                statePayload.returnTo,
                statePayload.mode === 'link' ? '/profile' : '/profile'
            ))
        } catch (serviceError) {
            await safeCreateAuthLog({
                userId: statePayload.userId || null,
                eventType: statePayload.mode === 'link'
                    ? 'oauth_link_failed'
                    : 'oauth_login_failed',
                ...getRequestMeta(req),
            })

            return redirectWithError(getOAuthServiceErrorMessage(serviceError))
        }
    })(req, res, next)
})

const getOAuthServiceErrorMessage = (error) => {
    if (error?.legacyMessage) {
        return error.legacyMessage
    }

    if (isApiMessageCode(error?.code)) {
        return 'Не удалось завершить вход через OAuth'
    }

    if (isDatabaseErrorCode(error?.code)) {
        return 'Не удалось завершить вход через OAuth. Попробуйте позже'
    }

    return error?.message || 'OAuth login failed'
}

const isApiMessageCode = (code) => (
    typeof code === 'string' && /^[A-Z]+(?:\.[A-Z0-9_]+)+$/.test(code)
)

const isDatabaseErrorCode = (code) => (
    typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)
)
