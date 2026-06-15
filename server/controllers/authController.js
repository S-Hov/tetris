import {
    createAuthLogService,
    getUserService,
    getVerificationMetaService,
    changeUnverifiedEmailService,
    completePasswordResetService,
    ensurePendingVerificationService,
    getPasswordResetMetaService,
    loginUserService,
    registerUserService,
    requestPasswordResetService,
    resendVerificationCodeService,
    updateUserPasswordService,
    updateUserAvatarService,
    updateUserProfileService,
    verifyEmailService,
    loginConfirmationService,
} from "../services/authService.js"
import {
    setInitialPasswordService,
} from '../services/oauthService.js'
import { asyncHandler } from "../utils/asyncHandler.js"
import bcrypt from "bcrypt"
import {
    sendRegistrationVerificationEmail,
    sendTemporaryPasswordEmail,
    sendVerificationEmail,
} from "../services/emailService.js"
import { getAuthCookieOptions, setAuthCookie } from "../utils/authCookie.js"
import { verifyTurnstile, turnstileErrorResponse } from "../utils/turnstile.js"
import {
    clearLoginFailures,
    recordLoginFailure,
    requiresLoginTurnstile,
} from "../utils/loginTurnstile.js"
import { ok, fail } from "../src/shared/responses/send.js"
import { forbidden } from "../helpers/error.helper.js"
import { publishActivityEvent } from "../services/activityFeedService.js"

const getRequestMeta = (req) => ({
    ipAddress: req.ip || req.socket?.remoteAddress || null,
    userAgent: req.get('user-agent') || null,
})

export const register = asyncHandler(async (req, res) => {
    console.log('запрос на регистрацию')
    const { username, email, password } = req.body

    const { user, verificationCode } = await registerUserService(username, email, password)
    const requestMeta = getRequestMeta(req)

    await createAuthLogService({
        userId: user.id,
        eventType: 'register_success',
        ...requestMeta,
    })
    publishActivityEvent({
        type: 'registered',
        actor: user.username || 'Новый игрок',
        detail: 'присоединился к PVP Tetris',
        metadata: {
            userId: user.id,
        },
    })

    try {
        await sendRegistrationVerificationEmail(user.email, verificationCode)
        console.log('письмо отправлено')
    } catch (error) {
        console.error('Email send error:', error)
    }

    return ok(res, req, 'AUTH.REGISTERED', {
        status: 201,
        data: {
            ...user,
            redirectTo: `/verify-email/${encodeURIComponent(user.email)}`
        },
    })
})

export const login = asyncHandler(async (req, res) => {
    const { email, password, turnstileToken } = req.body
    const requestMeta = getRequestMeta(req)
    const needsTurnstile = requiresLoginTurnstile(email, req.ip)

    if (needsTurnstile) {
        const isTurnstileValid = await verifyTurnstile(turnstileToken, req.ip)

        if (!isTurnstileValid) {
            return turnstileErrorResponse(res, req)
        }
    }

    const sendInvalidCredentials = async (userId = null) => {
        const requiresTurnstile = recordLoginFailure(email, req.ip)

        await createAuthLogService({
            userId,
            eventType: 'login_invalid_credentials',
            ...requestMeta,
        })

        return fail(res, req, 'AUTH.INVALID_CREDENTIALS', {
            status: 401,
            data: {
                requiresTurnstile,
            },
        })
    }

    const user = await loginUserService(email)

    if (!user) {
        return sendInvalidCredentials()
    }

    if (!user.password_hash) {
        await createAuthLogService({
            userId: user.id,
            eventType: 'login_password_missing',
            ...requestMeta,
        })

        throw forbidden('AUTH.EXTERNAL_PASSWORD_MISSING')
    }

    const isMatch = await bcrypt.compare(password, user.password_hash)

    if (!isMatch) {
        return sendInvalidCredentials(user.id)
    }

    if (user.status !== 'active') {
        await createAuthLogService({
            userId: user.id,
            eventType: 'login_unverified_email',
            ...requestMeta,
        })

        const pendingVerification = await ensurePendingVerificationService(user.email)

        if (pendingVerification.shouldSendEmail) {
            await sendVerificationEmail(pendingVerification.email, pendingVerification.verificationCode)
        }

        return fail(res, req, pendingVerification.shouldSendEmail
            ? 'AUTH.EMAIL_NOT_VERIFIED_CODE_SENT'
            : 'AUTH.EMAIL_NOT_VERIFIED', {
            status: 403,
            data: {
                code: 'EMAIL_NOT_VERIFIED',
                email: user.email,
                redirectTo: `/verify-email/${encodeURIComponent(user.email)}`,
            },
        })
    }

    await loginConfirmationService(user.id)
    clearLoginFailures(email, req.ip)
    await createAuthLogService({
        userId: user.id,
        eventType: 'login_success',
        ...requestMeta,
    })

    setAuthCookie(res, user)

    return ok(res, req, 'AUTH.LOGGED_IN', {
        data: {
            id: user.id,
            username: user.username,
            email: user.email,
            status: user.status,
        }
    })
})
export const getMe = asyncHandler(async (req, res) => {
    if (!req.user) {
        return ok(res, req, 'AUTH.GUEST_SESSION', {
            data: {
                user: null,
                isAuthenticated: false,
            }
        })
    }

    const userId = req.user.id

    const user = await getUserService(userId)

    return ok(res, req, 'AUTH.USER_LOADED', {
        data: {
            user,
            isAuthenticated: true,
        }
    })
})

export const updateMe = asyncHandler(async (req, res) => {
    const user = await updateUserProfileService({
        userId: req.user.id,
        username: req.body.username,
    })

    return ok(res, req, 'AUTH.PROFILE_UPDATED', {
        data: {
            user,
        },
    })
})

export const updateAvatar = asyncHandler(async (req, res) => {
    const user = await updateUserAvatarService({
        userId: req.user.id,
        contentType: req.get('content-type'),
        buffer: req.body,
    })

    return ok(res, req, 'AUTH.AVATAR_UPDATED', {
        data: {
            user,
        },
    })
})

export const updatePassword = asyncHandler(async (req, res) => {
    const user = await updateUserPasswordService({
        userId: req.user.id,
        currentPassword: req.body.currentPassword,
        nextPassword: req.body.newPassword,
    })
    const requestMeta = getRequestMeta(req)

    await createAuthLogService({
        userId: req.user.id,
        eventType: 'password_updated',
        ...requestMeta,
    })

    return ok(res, req, 'AUTH.PASSWORD_UPDATED', {
        data: {
            user,
        },
    })
})

export const setPassword = asyncHandler(async (req, res) => {
    const user = await setInitialPasswordService({
        userId: req.user.id,
        nextPassword: req.body.newPassword || req.body.password,
    })
    const requestMeta = getRequestMeta(req)

    await createAuthLogService({
        userId: req.user.id,
        eventType: 'password_set',
        ...requestMeta,
    })

    return ok(res, req, 'AUTH.PASSWORD_SET', {
        data: {
            user,
        },
    })
})

export const logout = (req, res) => {
    const requestMeta = getRequestMeta(req)

    if (req.user?.id) {
        void createAuthLogService({
            userId: req.user.id,
            eventType: 'logout',
            ...requestMeta,
        }).catch((error) => {
            console.error('Auth log error:', error)
        })
    }

    res.clearCookie('token', getAuthCookieOptions())

    return ok(res, req, 'AUTH.LOGGED_OUT')
}

export const getVerificationMeta = asyncHandler(async (req, res) => {
    const { email } = req.params

    const meta = await getVerificationMetaService(email)

    return ok(res, req, 'AUTH.VERIFICATION_META_LOADED', {
        data: meta,
    })
})

export const verifyEmail = asyncHandler(async (req, res) => {
    const { email } = req.params
    const { code } = req.body

    const user = await verifyEmailService(email, code)
    const requestMeta = getRequestMeta(req)

    await createAuthLogService({
        userId: user.id,
        eventType: 'email_verification_success',
        ...requestMeta,
    })

    return ok(res, req, 'AUTH.EMAIL_VERIFIED', {
        data: {
            user,
            redirectTo: '/login',
        },
    })
})

export const changeUnverifiedEmail = asyncHandler(async (req, res) => {
    const { currentEmail, email } = req.body

    const { user, verificationCode } = await changeUnverifiedEmailService({
        currentEmail,
        nextEmail: email,
    })
    const requestMeta = getRequestMeta(req)

    await sendVerificationEmail(user.email, verificationCode)
    await createAuthLogService({
        userId: user.id,
        eventType: 'verification_email_changed',
        ...requestMeta,
    })

    const meta = await getVerificationMetaService(user.email)

    return ok(res, req, 'AUTH.EMAIL_UPDATED', {
        data: {
            ...meta,
            redirectTo: `/verify-email/${encodeURIComponent(user.email)}`,
        },
    })
})

export const requestPasswordReset = asyncHandler(async (req, res) => {
    const { email } = req.body

    const { email: userEmail, verificationCode } = await requestPasswordResetService(email)

    await sendVerificationEmail(userEmail, verificationCode)

    const meta = await getPasswordResetMetaService(userEmail)

    return ok(res, req, 'AUTH.PASSWORD_RESET_CODE_SENT', {
        data: {
            ...meta,
            redirectTo: `/verify-email/${encodeURIComponent(userEmail)}?mode=password-reset`,
        },
    })
})

export const getPasswordResetMeta = asyncHandler(async (req, res) => {
    const { email } = req.params
    const meta = await getPasswordResetMetaService(email)

    return ok(res, req, 'AUTH.PASSWORD_RESET_META_LOADED', {
        data: meta,
    })
})

export const completePasswordReset = asyncHandler(async (req, res) => {
    const { email } = req.params
    const { code } = req.body

    const { email: userEmail, temporaryPassword } = await completePasswordResetService({ email, code })

    await sendTemporaryPasswordEmail(userEmail, temporaryPassword)

    return ok(res, req, 'AUTH.TEMPORARY_PASSWORD_SENT', {
        data: {
            redirectTo: '/login',
        },
    })
})

export const resendVerificationEmail = asyncHandler(async (req, res) => {
    const { email } = req.body

    const { email: userEmail, verificationCode } = await resendVerificationCodeService(email)

    await sendVerificationEmail(userEmail, verificationCode)

    const meta = await getVerificationMetaService(userEmail)

    return ok(res, req, 'AUTH.VERIFICATION_EMAIL_SENT', {
        data: meta,
    })
})

