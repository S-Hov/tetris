import passport from '../config/passport.js'
import { badRequest } from '../helpers/error.helper.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { setAuthCookie } from '../utils/authCookie.js'
import {
    createOAuthState,
    getOAuthStateCookieName,
    getOAuthStateCookieOptions,
    verifyOAuthState,
} from '../utils/oauthState.js'
import {
    OAUTH_PROVIDER_LABELS,
    isOAuthProviderEnabled,
    isSupportedOAuthProvider,
    resolveClientRedirectUrl,
} from '../config/oauthProviders.js'
import {
    createAuthLogService,
} from '../services/authService.js'
import { handleOAuthLoginService } from '../services/oauthService.js'

const getRequestMeta = (req) => ({
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
})

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

    passport.authenticate(provider, {
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

    passport.authenticate(provider, {
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

            await createAuthLogService({
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
            await createAuthLogService({
                userId: statePayload.userId || null,
                eventType: statePayload.mode === 'link'
                    ? 'oauth_link_failed'
                    : 'oauth_login_failed',
                ...getRequestMeta(req),
            })

            return redirectWithError(serviceError.message || 'OAuth login failed')
        }
    })(req, res, next)
})
