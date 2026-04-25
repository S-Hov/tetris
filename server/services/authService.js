import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { badRequest } from '../helpers/error.helper.js'
import {
    checkEmailRepo,
    createAuthLogRepo,
    createEmailVerificationRepo,
    expireEmailVerificationRepo,
    getRecentUserMatchesRepo,
    getLatestPendingVerificationByEmailRepo,
    getUserMatchStatsRepo,
    getUserByEmailRepo,
    getUserRepo,
    loginUserRepo,
    markEmailVerifiedRepo,
    registerUserWithVerificationRepo,
    updateUserLastLoginRepo,
} from '../repositories/authRepository.js'
import { getRoleByKeyRepo } from '../repositories/helper.js'

export const registerUserService = async (username, email, password) => {
    if (await checkEmailRepo(email)) {
        throw badRequest('Пользователь с таким email уже существует')
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const role = await getRoleByKeyRepo('user')
    if (!role) {
        throw badRequest('Роль user не найдена')
    }

    const verificationCode = createVerificationCode()
    const verificationCodeHash = hashVerificationCode(verificationCode)
    const expiresAt = createVerificationExpiresAt()

    const user = await registerUserWithVerificationRepo({
        username,
        email,
        passwordHash: hashedPassword,
        roleId: role.id,
        verificationCodeHash,
        expiresAt,
    })

    return {
        user,
        verificationCode,
    }
}

export const loginUserService = async (email) => {
    return await loginUserRepo(email)
}

export const loginConfirmationService = async (id) => {
    return await updateUserLastLoginRepo(id)
}

export const getUserService = async (id) => {
    const user = await getUserRepo(id)

    if (!user) {
        return null
    }

    const [stats, recentMatches] = await Promise.all([
        getUserMatchStatsRepo(id),
        getRecentUserMatchesRepo(id, 6),
    ])

    return {
        ...user,
        stats: {
            totalGames: Number(stats.total_games) || 0,
            wins: Number(stats.wins) || 0,
        },
        recentMatches: recentMatches.map((match) => ({
            id: match.id,
            mode: match.mode,
            status: match.status,
            playedAt: match.played_at,
            result: match.result || 'lose',
            score: Number(match.score) || 0,
            linesCleared: Number(match.lines_cleared) || 0,
            levelReached: Number(match.level_reached) || 1,
            opponent: match.opponent_username || match.opponent_nickname || 'Неизвестный соперник',
            opponentScore: Number(match.opponent_score) || 0,
        })),
    }
}

export const getVerificationMetaService = async (email) => {
    const user = await getUserByEmailRepo(email)

    if (!user) {
        throw badRequest('Пользователь не найден')
    }

    if (user.status === 'active') {
        return {
            email: user.email,
            codeLength: getVerificationCodeLength(),
            expiresInSeconds: 0,
            isVerified: true,
        }
    }

    const verification = await getLatestPendingVerificationByEmailRepo(email)

    if (!verification) {
        return {
            email: user.email,
            codeLength: getVerificationCodeLength(),
            expiresInSeconds: 0,
            isVerified: false,
        }
    }

    return {
        email: user.email,
        codeLength: getVerificationCodeLength(),
        expiresInSeconds: getRemainingSeconds(verification.expires_at),
        isVerified: false,
    }
}

export const verifyEmailService = async (email, code) => {
    const normalizedCode = String(code || '').trim()

    if (normalizedCode.length !== getVerificationCodeLength()) {
        throw badRequest('Введите полный код подтверждения')
    }

    const verification = await getLatestPendingVerificationByEmailRepo(email)

    if (!verification) {
        throw badRequest('Код подтверждения не найден. Запросите новый код')
    }

    if (getRemainingSeconds(verification.expires_at) <= 0) {
        await expireEmailVerificationRepo(verification.id)
        throw badRequest('Срок действия кода истёк. Запросите новый код')
    }

    const codeHash = hashVerificationCode(normalizedCode)

    if (codeHash !== verification.code_hash) {
        throw badRequest('Неверный код подтверждения')
    }

    return await markEmailVerifiedRepo({
        userId: verification.user_id,
        verificationId: verification.id,
    })
}

export const resendVerificationCodeService = async (email) => {
    const user = await getUserByEmailRepo(email)

    if (!user) {
        throw badRequest('Пользователь не найден')
    }

    if (user.status === 'active') {
        throw badRequest('Почта уже подтверждена')
    }

    const verificationCode = createVerificationCode()
    const verificationCodeHash = hashVerificationCode(verificationCode)

    await createEmailVerificationRepo({
        userId: user.id,
        email: user.email,
        verificationCodeHash,
        expiresAt: createVerificationExpiresAt(),
    })

    return {
        email: user.email,
        verificationCode,
    }
}

export const ensurePendingVerificationService = async (email) => {
    const user = await getUserByEmailRepo(email)

    if (!user) {
        throw badRequest('Пользователь не найден')
    }

    if (user.status === 'active') {
        return {
            email: user.email,
            shouldSendEmail: false,
            verificationCode: null,
        }
    }

    const verification = await getLatestPendingVerificationByEmailRepo(email)

    if (verification && getRemainingSeconds(verification.expires_at) > 0) {
        return {
            email: user.email,
            shouldSendEmail: false,
            verificationCode: null,
        }
    }

    const verificationCode = createVerificationCode()
    const verificationCodeHash = hashVerificationCode(verificationCode)

    await createEmailVerificationRepo({
        userId: user.id,
        email: user.email,
        verificationCodeHash,
        expiresAt: createVerificationExpiresAt(),
    })

    return {
        email: user.email,
        shouldSendEmail: true,
        verificationCode,
    }
}

export const createAuthLogService = async (payload) => {
    return await createAuthLogRepo(payload)
}

export const getVerificationCodeLength = () => {
    const codeLength = Number(process.env.EMAIL_VERIFICATION_CODE_LENGTH || 6)

    if (!Number.isInteger(codeLength) || codeLength < 4 || codeLength > 8) {
        return 6
    }

    return codeLength
}

const createVerificationCode = () => {
    const codeLength = getVerificationCodeLength()
    const min = 10 ** (codeLength - 1)
    const max = 10 ** codeLength

    return String(crypto.randomInt(min, max))
}

const hashVerificationCode = (code) => {
    return crypto
        .createHash('sha256')
        .update(String(code))
        .digest('hex')
}

const createVerificationExpiresAt = () => {
    const ttlSeconds = Number(process.env.EMAIL_VERIFICATION_TTL_SECONDS || 180)

    return new Date(Date.now() + ttlSeconds * 1000)
}

const getRemainingSeconds = (expiresAt) => {
    const expiresAtTime = new Date(expiresAt).getTime()

    if (Number.isNaN(expiresAtTime)) {
        return 0
    }

    return Math.max(0, Math.ceil((expiresAtTime - Date.now()) / 1000))
}
