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
import { asyncHandler } from "../utils/asyncHandler.js"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"
import { sendTemporaryPasswordEmail, sendVerificationEmail } from "../services/emailService.js"

const authCookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
}

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

    try {
        await sendVerificationEmail(user.email, verificationCode)
        console.log('письмо отправлено')
    } catch (error) {
        console.error('Email send error:', error)
    }

    res.status(201).json({
        data: {
            ...user,
            redirectTo: `/verify-email/${encodeURIComponent(user.email)}`
        },
        message: "Пользователь зарегистрирован",
        success: true
    })
})

export const login = asyncHandler(async (req, res) => {
    const { email, password } = req.body
    const requestMeta = getRequestMeta(req)

    const user = await loginUserService(email)

    if (!user) {
        await createAuthLogService({
            userId: null,
            eventType: 'login_invalid_credentials',
            ...requestMeta,
        })

        const error = new Error("Неверный Email или пароль")
        error.statusCode = 401
        throw error
    }

    const isMatch = await bcrypt.compare(password, user.password_hash)

    if (!isMatch) {
        await createAuthLogService({
            userId: user.id,
            eventType: 'login_invalid_credentials',
            ...requestMeta,
        })

        const error = new Error("Неверный Email или пароль")
        error.statusCode = 401
        throw error
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

        return res.status(403).json({
            success: false,
            message: pendingVerification.shouldSendEmail
                ? 'Почта не подтверждена. Мы отправили новый код'
                : 'Почта не подтверждена. Введите код из письма',
            data: {
                code: 'EMAIL_NOT_VERIFIED',
                email: user.email,
                redirectTo: `/verify-email/${encodeURIComponent(user.email)}`,
            },
        })
    }

    await loginConfirmationService(user.id)
    await createAuthLogService({
        userId: user.id,
        eventType: 'login_success',
        ...requestMeta,
    })

    const token = jwt.sign(
        { id: user.id, roleId: user.role_id },
        process.env.JWT_SECRET,
        { expiresIn: `${parseInt(process.env.TOKEN_LIFETIME)}d` }
    )

    res.cookie('token', token, {
        ...authCookieOptions,
        maxAge: 1000 * 60 * 60 * 24 * parseInt(process.env.TOKEN_LIFETIME)
    })

    res.json({
        success: true,
        message: "Вы успешно вошли в аккаунт",
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
        return res.json({
            success: true,
            message: "Guest session",
            data: {
                user: null,
                isAuthenticated: false,
            }
        })
    }

    const userId = req.user.id

    const user = await getUserService(userId)

    res.json({
        success: true,
        message: "User fetched successfully",
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

    res.json({
        success: true,
        message: 'Профиль обновлён',
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

    res.json({
        success: true,
        message: 'Аватар обновлён',
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

    res.json({
        success: true,
        message: 'Пароль обновлён',
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

    res.clearCookie('token', authCookieOptions)

    res.json({
        success: true,
        message: 'Logged out successfully'
    })
}

export const getVerificationMeta = asyncHandler(async (req, res) => {
    const { email } = req.params

    const meta = await getVerificationMetaService(email)

    res.json({
        success: true,
        message: 'Verification metadata fetched successfully',
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

    res.json({
        success: true,
        message: 'Email verified successfully',
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

    res.json({
        success: true,
        message: 'Почта обновлена. Новый код отправлен',
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

    res.json({
        success: true,
        message: 'Код восстановления отправлен',
        data: {
            ...meta,
            redirectTo: `/verify-email/${encodeURIComponent(userEmail)}?mode=password-reset`,
        },
    })
})

export const getPasswordResetMeta = asyncHandler(async (req, res) => {
    const { email } = req.params
    const meta = await getPasswordResetMetaService(email)

    res.json({
        success: true,
        message: 'Password reset metadata fetched successfully',
        data: meta,
    })
})

export const completePasswordReset = asyncHandler(async (req, res) => {
    const { email } = req.params
    const { code } = req.body

    const { email: userEmail, temporaryPassword } = await completePasswordResetService({ email, code })

    await sendTemporaryPasswordEmail(userEmail, temporaryPassword)

    res.json({
        success: true,
        message: 'Новый пароль отправлен на почту',
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

    res.json({
        success: true,
        message: 'Verification email sent successfully',
        data: meta,
    })
})
