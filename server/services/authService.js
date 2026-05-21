import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { badRequest } from '../helpers/error.helper.js'
import {
    checkEmailRepo,
    changePendingUserEmailRepo,
    createAuthLogRepo,
    createEmailVerificationRepo,
    expireEmailVerificationRepo,
    getRecentUserMatchesRepo,
    getRecentLoginHistoryRepo,
    getLatestPendingVerificationByEmailRepo,
    getUserMatchStatsRepo,
    getUserRankStatsRepo,
    getUserByEmailRepo,
    getUserAuthByIdRepo,
    getUserRepo,
    loginUserRepo,
    markEmailVerifiedRepo,
    updateUserPasswordRepo,
    registerUserWithVerificationRepo,
    updateUserAvatarRepo,
    updateUserLastLoginRepo,
    updateUserProfileRepo,
    requestUserEmailChangeRepo,
} from '../repositories/authRepository.js'
import { getRoleByKeyRepo } from '../repositories/helper.js'
import { getRankTier } from './rankRules.js'
import { storeUploadedAssetRepo } from '../repositories/uploadedAssetRepository.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SERVER_ROOT = path.resolve(__dirname, '..')
const AVATAR_UPLOAD_DIR = path.join(SERVER_ROOT, 'uploads', 'avatars')
const MAX_AVATAR_SIZE_BYTES = 2 * 1024 * 1024
const AVATAR_TYPES = {
    'image/png': { ext: 'png', validate: (buffer) => buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47])) },
    'image/jpeg': { ext: 'jpg', validate: (buffer) => buffer.subarray(0, 3).equals(Buffer.from([0xFF, 0xD8, 0xFF])) },
    'image/gif': { ext: 'gif', validate: (buffer) => ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii')) },
    'image/webp': { ext: 'webp', validate: (buffer) => buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP' },
    'image/avif': { ext: 'avif', validate: (buffer) => buffer.subarray(4, 8).toString('ascii') === 'ftyp' },
    'video/webm': { ext: 'webm', validate: (buffer) => buffer.subarray(0, 4).equals(Buffer.from([0x1A, 0x45, 0xDF, 0xA3])) },
}

const PASSWORD_RULE_MESSAGE = 'Пароль должен быть 8-16 символов, с заглавной, строчной буквой и цифрой'

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

    const [stats, rankStats, recentMatches] = await Promise.all([
        getUserMatchStatsRepo(id),
        getUserRankStatsRepo(id),
        getRecentUserMatchesRepo(id, 6),
    ])
    const totalRankedMatches = Number(rankStats?.total_matches) || 0
    const rankedWins = Number(rankStats?.wins) || 0
    const rankPoints = Number(rankStats?.rank_points) || 0
    const rank = await getRankTier(rankPoints)

    return {
        ...user,
        stats: {
            totalGames: Number(stats.total_games) || 0,
            wins: Number(stats.wins) || 0,
        },
        rankStats: {
            rankPoints,
            mmr: Number(rankStats?.mmr) || 1000,
            wins: rankedWins,
            losses: Number(rankStats?.losses) || 0,
            draws: Number(rankStats?.draws) || 0,
            totalMatches: totalRankedMatches,
            winRate: totalRankedMatches > 0
                ? Math.round((rankedWins / totalRankedMatches) * 100)
                : 0,
            bestSoloScore: Number(rankStats?.best_solo_score) || 0,
            rank,
        },
        recentMatches: recentMatches.map((match) => ({
            id: match.id,
            mode: match.mode,
            status: match.status,
            playedAt: match.played_at,
            result: match.result || 'lose',
            score: Number(match.self_team_score ?? match.score) || 0,
            linesCleared: Number(match.lines_cleared) || 0,
            levelReached: Number(match.level_reached) || 1,
            opponent: match.opponent_label || 'Неизвестный соперник',
            opponentScore: Number(match.opponent_team_score) || 0,
        })),
    }
}

export const updateUserProfileService = async ({ userId, username }) => {
    const normalizedUsername = normalizeUsername(username)

    if (!normalizedUsername) {
        throw badRequest('Введите имя игрока')
    }

    const user = await updateUserProfileRepo({
        userId,
        username: normalizedUsername,
    })

    if (!user) {
        throw badRequest('Пользователь не найден')
    }

    return await getUserService(userId)
}

export const updateUserAvatarService = async ({ userId, contentType, buffer }) => {
    const normalizedContentType = String(contentType || '').split(';')[0].trim().toLowerCase()
    const avatarType = AVATAR_TYPES[normalizedContentType]

    if (!avatarType) {
        throw badRequest('Поддерживаются только PNG, JPG, GIF, WEBP, AVIF и WEBM')
    }

    if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
        throw badRequest('Файл не найден')
    }

    if (buffer.length > MAX_AVATAR_SIZE_BYTES) {
        throw badRequest('Аватарка не должна быть больше 2 МБ')
    }

    if (!avatarType.validate(buffer)) {
        throw badRequest('Файл не похож на заявленный формат изображения')
    }

    await fs.mkdir(AVATAR_UPLOAD_DIR, { recursive: true })

    const fileHash = crypto
        .createHash('sha256')
        .update(`${userId}:${Date.now()}:${crypto.randomUUID()}`)
        .digest('hex')
        .slice(0, 32)
    const filename = `${userId}-${fileHash}.${avatarType.ext}`
    const filePath = path.join(AVATAR_UPLOAD_DIR, filename)
    const avatarUrl = `/uploads/avatars/${filename}`

    const currentUser = await getUserRepo(userId)

    if (!currentUser) {
        throw badRequest('Пользователь не найден')
    }

    try {
        await fs.writeFile(filePath, buffer, { flag: 'wx' })
        await storeUploadedAssetRepo({
            url: avatarUrl,
            contentType: normalizedContentType,
            buffer,
        })
    } catch (error) {
        await deleteLocalAvatarFile(avatarUrl)
        throw error
    }

    const user = await updateUserAvatarRepo({
        userId,
        avatarUrl,
    })

    if (!user) {
        await deleteLocalAvatarFile(avatarUrl)
        throw badRequest('Пользователь не найден')
    }

    await deleteLocalAvatarFile(currentUser.avatar_url)

    return await getUserService(userId)
}

export const requestAccountEmailChangeService = async ({ userId, nextEmail }) => {
    const normalizedNextEmail = normalizeEmail(nextEmail)

    if (!normalizedNextEmail) {
        throw badRequest('Введите корректный email')
    }

    const currentUser = await getUserRepo(userId)

    if (!currentUser) {
        throw badRequest('Пользователь не найден')
    }

    if (normalizeEmail(currentUser.email) === normalizedNextEmail) {
        throw badRequest('Новая почта совпадает с текущей')
    }

    if (await checkEmailRepo(normalizedNextEmail)) {
        throw badRequest('Пользователь с таким email уже существует')
    }

    const verificationCode = createVerificationCode()
    const verificationCodeHash = hashVerificationCode(verificationCode)

    const user = await requestUserEmailChangeRepo({
        userId,
        nextEmail: normalizedNextEmail,
        verificationCodeHash,
        expiresAt: createVerificationExpiresAt(),
    })

    if (!user) {
        throw badRequest('Не удалось обновить почту')
    }

    return {
        user,
        verificationCode,
    }
}

export const changeUnverifiedEmailService = async ({ currentEmail, nextEmail }) => {
    const normalizedCurrentEmail = normalizeEmail(currentEmail)
    const normalizedNextEmail = normalizeEmail(nextEmail)

    if (!normalizedCurrentEmail || !normalizedNextEmail) {
        throw badRequest('Введите корректный email')
    }

    if (normalizedCurrentEmail === normalizedNextEmail) {
        throw badRequest('Новая почта совпадает с текущей')
    }

    const user = await getUserByEmailRepo(normalizedCurrentEmail)

    if (!user) {
        throw badRequest('Аккаунт с текущей почтой не найден')
    }

    if (user.status === 'active') {
        throw badRequest('Почта уже подтверждена. Изменить её можно только через настройки аккаунта')
    }

    if (await checkEmailRepo(normalizedNextEmail)) {
        throw badRequest('Пользователь с таким email уже существует')
    }

    const verificationCode = createVerificationCode()
    const verificationCodeHash = hashVerificationCode(verificationCode)

    const updatedUser = await changePendingUserEmailRepo({
        userId: user.id,
        currentEmail: normalizedCurrentEmail,
        nextEmail: normalizedNextEmail,
        verificationCodeHash,
        expiresAt: createVerificationExpiresAt(),
    })

    if (!updatedUser) {
        throw badRequest('Не удалось обновить почту. Запросите новый код или зарегистрируйтесь заново')
    }

    return {
        user: updatedUser,
        verificationCode,
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

export const requestPasswordResetService = async (email) => {
    const normalizedEmail = normalizeEmail(email)
    const user = await getUserByEmailRepo(normalizedEmail)

    if (!user) {
        throw badRequest('Пользователь с таким email не найден')
    }

    if (user.status !== 'active') {
        throw badRequest('Сначала подтвердите почту аккаунта')
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

export const getPasswordResetMetaService = async (email) => {
    const normalizedEmail = normalizeEmail(email)
    const user = await getUserByEmailRepo(normalizedEmail)

    if (!user) {
        throw badRequest('Пользователь не найден')
    }

    if (user.status !== 'active') {
        throw badRequest('Сначала подтвердите почту аккаунта')
    }

    const verification = await getLatestPendingVerificationByEmailRepo(user.email)

    return {
        email: user.email,
        codeLength: getVerificationCodeLength(),
        expiresInSeconds: verification ? getRemainingSeconds(verification.expires_at) : 0,
        isVerified: false,
        mode: 'password-reset',
    }
}

export const completePasswordResetService = async ({ email, code }) => {
    const normalizedEmail = normalizeEmail(email)
    const normalizedCode = String(code || '').trim()

    if (normalizedCode.length !== getVerificationCodeLength()) {
        throw badRequest('Введите полный код подтверждения')
    }

    const user = await getUserByEmailRepo(normalizedEmail)

    if (!user || user.status !== 'active') {
        throw badRequest('Аккаунт не найден или почта не подтверждена')
    }

    const verification = await getLatestPendingVerificationByEmailRepo(user.email)

    if (!verification) {
        throw badRequest('Код восстановления не найден. Запросите новый код')
    }

    if (verification.user_id !== user.id) {
        throw badRequest('Код восстановления не подходит для этого аккаунта')
    }

    if (getRemainingSeconds(verification.expires_at) <= 0) {
        await expireEmailVerificationRepo(verification.id)
        throw badRequest('Срок действия кода истёк. Запросите новый код')
    }

    if (hashVerificationCode(normalizedCode) !== verification.code_hash) {
        throw badRequest('Неверный код подтверждения')
    }

    const temporaryPassword = createTemporaryPassword()
    const passwordHash = await bcrypt.hash(temporaryPassword, 10)

    await updateUserPasswordRepo({
        userId: user.id,
        passwordHash,
    })
    await expireEmailVerificationRepo(verification.id)

    return {
        email: user.email,
        temporaryPassword,
    }
}

export const updateUserPasswordService = async ({ userId, currentPassword, nextPassword }) => {
    const user = await getUserAuthByIdRepo(userId)

    if (!user) {
        throw badRequest('Пользователь не найден')
    }

    if (!isStrongPassword(nextPassword)) {
        throw badRequest(PASSWORD_RULE_MESSAGE)
    }

    if (!user.password_hash) {
        throw badRequest('Пароль еще не установлен. Используйте установку пароля')
    }

    const isCurrentPasswordValid = await bcrypt.compare(String(currentPassword || ''), user.password_hash)

    if (!isCurrentPasswordValid) {
        throw badRequest('Текущий пароль указан неверно')
    }

    const isSamePassword = await bcrypt.compare(String(nextPassword || ''), user.password_hash)

    if (isSamePassword) {
        throw badRequest('Новый пароль совпадает с текущим')
    }

    const passwordHash = await bcrypt.hash(nextPassword, 10)

    await updateUserPasswordRepo({
        userId,
        passwordHash,
    })

    return await getUserService(userId)
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

export const getLoginHistoryService = async (userId, limit = 5) => {
    const rows = await getRecentLoginHistoryRepo(userId, limit)

    return rows.map((row) => ({
        id: row.id,
        eventType: row.event_type,
        ipAddress: row.ip_address,
        location: formatLoginLocation(row.ip_address),
        device: formatDevice(row.user_agent),
        userAgent: row.user_agent,
        createdAt: row.created_at,
    }))
}

export const getVerificationCodeLength = () => {
    const codeLength = Number(process.env.EMAIL_VERIFICATION_CODE_LENGTH || 6)

    if (!Number.isInteger(codeLength) || codeLength < 4 || codeLength > 8) {
        return 6
    }

    return codeLength
}

const normalizeEmail = (email) => String(email || '').trim().toLowerCase()

const isStrongPassword = (password) => (
    typeof password === 'string' &&
    password.length >= 8 &&
    password.length <= 16 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
)

const createTemporaryPassword = () => {
    const lower = 'abcdefghjkmnpqrstuvwxyz'
    const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ'
    const digits = '23456789'
    const all = `${lower}${upper}${digits}`
    const requiredChars = [
        upper[crypto.randomInt(upper.length)],
        lower[crypto.randomInt(lower.length)],
        digits[crypto.randomInt(digits.length)],
    ]

    while (requiredChars.length < 12) {
        requiredChars.push(all[crypto.randomInt(all.length)])
    }

    return requiredChars
        .sort(() => crypto.randomInt(3) - 1)
        .join('')
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

const normalizeUsername = (value) => {
    const username = String(value || '').trim().replace(/\s+/g, ' ')

    if (username.length < 2 || username.length > 32) {
        return null
    }

    if (!/^[\p{L}\p{N}_ .-]+$/u.test(username)) {
        return null
    }

    return username
}

const deleteLocalAvatarFile = async (avatarUrl) => {
    const normalizedUrl = String(avatarUrl || '')

    if (!normalizedUrl.startsWith('/uploads/avatars/')) {
        return
    }

    const filename = path.basename(normalizedUrl)
    const avatarPath = path.resolve(AVATAR_UPLOAD_DIR, filename)
    const uploadDir = path.resolve(AVATAR_UPLOAD_DIR)

    if (!avatarPath.startsWith(`${uploadDir}${path.sep}`)) {
        return
    }

    try {
        await fs.unlink(avatarPath)
    } catch (error) {
        if (error.code !== 'ENOENT') {
            console.error('Avatar cleanup error:', error)
        }
    }
}

const formatLoginLocation = (ipAddress) => {
    if (!ipAddress) {
        return 'Адрес не определен'
    }

    const normalizedIp = String(ipAddress).replace(/^::ffff:/, '')

    if (
        normalizedIp === '::1' ||
        normalizedIp === '127.0.0.1' ||
        normalizedIp.startsWith('10.') ||
        normalizedIp.startsWith('192.168.') ||
        /^172\.(1[6-9]|2\d|3[0-1])\./.test(normalizedIp)
    ) {
        return 'Локальная сеть'
    }

    return `IP ${normalizedIp}`
}

const formatDevice = (userAgent) => {
    const value = String(userAgent || '')

    if (!value) {
        return 'Неизвестное устройство'
    }

    const browser = value.includes('Edg/')
        ? 'Edge'
        : value.includes('Chrome/')
            ? 'Chrome'
            : value.includes('Firefox/')
                ? 'Firefox'
                : value.includes('Safari/')
                    ? 'Safari'
                    : 'Браузер'

    const os = value.includes('Windows')
        ? 'Windows'
        : value.includes('Mac OS')
            ? 'macOS'
            : value.includes('Android')
                ? 'Android'
                : value.includes('iPhone') || value.includes('iPad')
                    ? 'iOS'
                    : value.includes('Linux')
                        ? 'Linux'
                        : 'Устройство'

    return `${browser} на ${os}`
}

const getRemainingSeconds = (expiresAt) => {
    const expiresAtTime = new Date(expiresAt).getTime()

    if (Number.isNaN(expiresAtTime)) {
        return 0
    }

    return Math.max(0, Math.ceil((expiresAtTime - Date.now()) / 1000))
}
