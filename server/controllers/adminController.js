import { asyncHandler } from '../utils/asyncHandler.js'
import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
    createAdminResourceRepo,
    deleteAdminUserAccountRepo,
    deleteAdminResourceRepo,
    deleteAdminUserRepo,
    deleteDatabaseBackupRepo,
    getAdminDashboardRepo,
    getDatabaseBackupPathRepo,
    getDatabaseControlRepo,
    getDatabaseSchemaRepo,
    getAdminNavigationRepo,
    getAdminResourceRepo,
    getAdminUserRepo,
    getAdminUserDetailsRepo,
    getAdminMatchTeamDetailsRepo,
    manageAdminUserRepo,
    updateAdminResourceRepo,
    updateAdminResourceStatusRepo,
    updateAdminUserRepo,
    createDatabaseBackupRepo,
    exportDatabaseDataRepo,
    importDatabaseDataRepo,
    listDatabaseBackupsRepo,
    restoreDatabaseBackupRepo,
} from '../repositories/adminRepository.js'
import { badRequest } from '../helpers/error.helper.js'
import { updateUserAvatarService } from '../services/authService.js'
import {
    getSupportRequestByIdRepo,
    getSupportRequestMessagesRepo,
} from '../repositories/supportRepository.js'
import { replyToSupportRequest } from '../services/supportReplyService.js'
import { closeSupportRequest } from '../services/supportCloseService.js'
import { runPendingMigrations } from '../services/migrationService.js'
import { storeUploadedAssetRepo } from '../repositories/uploadedAssetRepository.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const SERVER_ROOT = path.resolve(__dirname, '..')
const RESOURCE_UPLOAD_TYPES = {
    'image/png': { ext: 'png', validate: (buffer) => buffer.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47])) },
    'image/jpeg': { ext: 'jpg', validate: (buffer) => buffer.subarray(0, 3).equals(Buffer.from([0xFF, 0xD8, 0xFF])) },
    'image/gif': { ext: 'gif', validate: (buffer) => ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii')) },
    'image/webp': { ext: 'webp', validate: (buffer) => buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP' },
    'image/avif': { ext: 'avif', validate: (buffer) => buffer.subarray(4, 8).toString('ascii') === 'ftyp' },
    'image/svg+xml': { ext: 'svg', validate: (buffer) => buffer.subarray(0, 512).toString('utf8').includes('<svg') },
}
const RESOURCE_UPLOAD_TARGETS = {
    gameEffects: {
        image_url: 'effects',
    },
    rankTiers: {
        image_url: 'ranks',
    },
    donationCurrencies: {
        icon_url: 'donations/currencies',
    },
    donationNetworks: {
        icon_url: 'donations/networks',
    },
}
const MAX_RESOURCE_UPLOAD_SIZE_BYTES = 4 * 1024 * 1024

const sendAdminResponse = (res, message, data) => {
    res.json({
        success: true,
        message,
        data,
    })
}

export const getAdminMe = asyncHandler(async (req, res) => {
    const user = await getAdminUserRepo(req.user.id)

    sendAdminResponse(res, 'Admin profile loaded', {
        user,
    })
})

export const getAdminNavigation = asyncHandler(async (req, res) => {
    const resources = await getAdminNavigationRepo()

    sendAdminResponse(res, 'Admin navigation loaded', {
        resources,
        sections: [
            {
                key: 'overview',
                label: 'Обзор',
                children: ['Дашборд', 'Посещения', 'Игровая статистика', 'Онлайн'],
            },
            {
                key: 'users',
                label: 'Пользователи',
                children: ['Аккаунты', 'Роли', 'Логи входа', 'Подтверждение email'],
            },
            {
                key: 'games',
                label: 'Игры',
                children: ['Матчи', 'Команды', 'Игроки матчей', 'События', 'Комнаты'],
            },
            {
                key: 'rating',
                label: 'Рейтинг',
                children: ['Текущие ранги', 'История рейтинга', 'Лидерборд'],
            },
            {
                key: 'support',
                label: 'Поддержка',
                children: ['Обращения', 'Очередь модерации'],
            },
            {
                key: 'donations',
                label: 'Донаты',
                children: ['Платежи', 'Валюты', 'Сети', 'Валюты и сети', 'Кошельки', 'Проверки транзакций'],
            },
            {
                key: 'system',
                label: 'Система',
                children: ['Сеансы', 'Аудит админов', 'Справочник схемы'],
            },
        ],
    })
})

export const getDashboardOverview = asyncHandler(async (req, res) => {
    const data = await getAdminDashboardRepo(req.query)

    sendAdminResponse(res, 'Admin dashboard loaded', data)
})

export const getDatabaseSchema = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Database schema loaded', await getDatabaseSchemaRepo())
})

export const getDatabaseControl = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Database control loaded', await getDatabaseControlRepo())
})

export const exportDatabase = asyncHandler(async (req, res) => {
    const data = await exportDatabaseDataRepo({
        tables: normalizeTableList(req.body?.tables),
    })
    const fileName = `pvp-blocks-db-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`

    res.setHeader('Content-Type', 'application/json')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    res.send(JSON.stringify(data, null, 2))
})

export const importDatabase = asyncHandler(async (req, res) => {
    const mode = normalizeImportMode(req.query.mode || req.headers['x-import-mode'])
    const tables = normalizeTableList(req.query.tables || req.headers['x-import-tables'])
    const result = await importDatabaseDataRepo({
        payload: req.body,
        mode,
        tables,
    })

    sendAdminResponse(res, 'Database import completed', result)
})

export const getDatabaseBackups = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Database backups loaded', {
        backups: await listDatabaseBackupsRepo(),
    })
})

export const createDatabaseBackup = asyncHandler(async (req, res) => {
    const backup = await createDatabaseBackupRepo({
        tables: normalizeTableList(req.body?.tables),
    })

    sendAdminResponse(res, 'Database backup created', { backup })
})

export const downloadDatabaseBackup = asyncHandler(async (req, res) => {
    const filePath = await getDatabaseBackupPathRepo(req.params.fileName)

    res.download(filePath, req.params.fileName)
})

export const deleteDatabaseBackup = asyncHandler(async (req, res) => {
    const backup = await deleteDatabaseBackupRepo(req.params.fileName)

    sendAdminResponse(res, 'Database backup deleted', { backup })
})

export const restoreDatabaseBackup = asyncHandler(async (req, res) => {
    const result = await restoreDatabaseBackupRepo({
        fileName: req.params.fileName,
        mode: normalizeImportMode(req.body?.mode),
        tables: normalizeTableList(req.body?.tables),
    })

    sendAdminResponse(res, 'Database backup restored', result)
})

export const getVisitAnalytics = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Visit analytics loaded', await getAdminResourceRepo('visits', req.query))
})

export const getGameAnalytics = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Game analytics loaded', await getAdminResourceRepo('gameActivity', req.query))
})

export const getActiveSessions = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Active sessions loaded', await getAdminResourceRepo('sessions', req.query))
})

export const getResourceByKey = asyncHandler(async (req, res) => {
    const data = await getAdminResourceRepo(req.params.resourceKey, req.query)

    if (!data) {
        res.status(404).json({
            success: false,
            message: 'Admin resource not found',
            data: null,
        })
        return
    }

    sendAdminResponse(res, 'Admin resource loaded', data)
})

export const uploadResourceFileByKey = asyncHandler(async (req, res) => {
    const field = String(req.query?.field || '').trim()
    const uploadDir = RESOURCE_UPLOAD_TARGETS[req.params.resourceKey]?.[field]

    if (!uploadDir) {
        throw badRequest('Р—Р°РіСЂСѓР·РєР° С„Р°Р№Р»РѕРІ РґР»СЏ СЌС‚РѕРіРѕ РїРѕР»СЏ РЅРµРґРѕСЃС‚СѓРїРЅР°')
    }

    const normalizedContentType = String(req.get('content-type') || '').split(';')[0].trim().toLowerCase()
    const fileType = RESOURCE_UPLOAD_TYPES[normalizedContentType]

    if (!fileType) {
        throw badRequest('РџРѕРґРґРµСЂР¶РёРІР°СЋС‚СЃСЏ С‚РѕР»СЊРєРѕ PNG, JPG, GIF, WEBP, AVIF Рё SVG')
    }

    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
        throw badRequest('Р¤Р°Р№Р» РЅРµ РЅР°Р№РґРµРЅ')
    }

    if (req.body.length > MAX_RESOURCE_UPLOAD_SIZE_BYTES) {
        throw badRequest('Р¤Р°Р№Р» РЅРµ РґРѕР»Р¶РµРЅ Р±С‹С‚СЊ Р±РѕР»СЊС€Рµ 4 РњР‘')
    }

    if (!fileType.validate(req.body)) {
        throw badRequest('Р¤Р°Р№Р» РЅРµ РїРѕС…РѕР¶ РЅР° Р·Р°СЏРІР»РµРЅРЅС‹Р№ С„РѕСЂРјР°С‚ РёР·РѕР±СЂР°Р¶РµРЅРёСЏ')
    }

    const targetDir = path.join(SERVER_ROOT, 'uploads', uploadDir)
    await fs.mkdir(targetDir, { recursive: true })

    const baseName = normalizeUploadBaseName(req.query?.name || field)
    const fileHash = crypto
        .createHash('sha256')
        .update(`${req.params.resourceKey}:${field}:${Date.now()}:${crypto.randomUUID()}`)
        .digest('hex')
        .slice(0, 20)
    const filename = `${baseName}-${fileHash}.${fileType.ext}`
    const filePath = path.join(targetDir, filename)
    const publicUrl = `/uploads/${uploadDir}/${filename}`

    try {
        await fs.writeFile(filePath, req.body, { flag: 'wx' })
        await storeUploadedAssetRepo({
            url: publicUrl,
            contentType: normalizedContentType,
            buffer: req.body,
        })
    } catch (error) {
        try {
            await fs.unlink(filePath)
        } catch (unlinkError) {
            if (unlinkError.code !== 'ENOENT') {
                console.error('Resource upload cleanup error:', unlinkError)
            }
        }

        throw error
    }

    sendAdminResponse(res, 'Admin resource file uploaded', {
        field,
        url: publicUrl,
    })
})

export const createResourceByKey = asyncHandler(async (req, res) => {
    try {
        const item = await createAdminResourceRepo(req.params.resourceKey, req.body || {})

        sendAdminResponse(res, 'Admin resource item created', { item })
    } catch (error) {
        if (error.code === '23505') {
            throw badRequest('Такая запись уже существует')
        }

        if (error.code === '23503') {
            throw badRequest('Связанная запись не найдена')
        }

        throw badRequest(error.message || 'Не удалось создать запись')
    }
})

export const updateResourceByKey = asyncHandler(async (req, res) => {
    try {
        const item = await updateAdminResourceRepo(req.params.resourceKey, req.params.resourceId, req.body || {})

        if (!item) {
            res.status(404).json({
                success: false,
                message: 'Запись не найдена',
                data: null,
            })
            return
        }

        sendAdminResponse(res, 'Admin resource item updated', { item })
    } catch (error) {
        if (error.code === '23505') {
            throw badRequest('Такая запись уже существует')
        }

        if (error.code === '23503') {
            throw badRequest('Связанная запись не найдена')
        }

        throw badRequest(error.message || 'Не удалось обновить запись')
    }
})

export const updateResourceStatusByKey = asyncHandler(async (req, res) => {
    try {
        const item = await updateAdminResourceStatusRepo(req.params.resourceKey, req.params.resourceId, req.body?.status)

        if (!item) {
            res.status(404).json({
                success: false,
                message: 'Запись не найдена',
                data: null,
            })
            return
        }

        sendAdminResponse(res, 'Admin resource item status updated', { item })
    } catch (error) {
        throw badRequest(error.message || 'Не удалось изменить статус')
    }
})

export const deleteResourceByKey = asyncHandler(async (req, res) => {
    try {
        const item = await deleteAdminResourceRepo(req.params.resourceKey, req.params.resourceId)

        if (!item) {
            res.status(404).json({
                success: false,
                message: 'Запись не найдена',
                data: null,
            })
            return
        }

        sendAdminResponse(res, 'Admin resource item deleted', { item })
    } catch (error) {
        if (error.code === '23503') {
            throw badRequest('Нельзя удалить запись, пока на неё ссылаются другие данные')
        }

        throw badRequest(error.message || 'Не удалось удалить запись')
    }
})

export const getUsers = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Users loaded', await getAdminResourceRepo('users', req.query))
})

export const getUserDetails = asyncHandler(async (req, res) => {
    const data = await getAdminUserDetailsRepo(req.params.userId, req.query)

    if (!data) {
        res.status(404).json({
            success: false,
            message: 'Пользователь не найден',
            data: null,
        })
        return
    }

    sendAdminResponse(res, 'User details loaded', data)
})

export const updateUser = asyncHandler(async (req, res) => {
    const username = normalizeUsername(req.body?.username)
    const email = normalizeEmail(req.body?.email)
    const status = normalizeStatus(req.body?.status)

    if (!username) {
        throw badRequest('Введите корректный ник от 2 до 100 символов')
    }

    if (!email) {
        throw badRequest('Введите корректную почту')
    }

    if (!status) {
        throw badRequest('Выберите корректный статус пользователя')
    }

    let user

    try {
        user = await updateAdminUserRepo({
            userId: req.params.userId,
            username,
            email,
            status,
        })
    } catch (error) {
        if (error.code === '23505') {
            throw badRequest('Пользователь с такой почтой уже существует')
        }

        throw error
    }

    if (!user) {
        res.status(404).json({
            success: false,
            message: 'Пользователь не найден',
            data: null,
        })
        return
    }

    sendAdminResponse(res, 'Пользователь обновлён', { user })
})

export const manageUser = asyncHandler(async (req, res) => {
    const username = normalizeUsername(req.body?.username)
    const email = normalizeEmail(req.body?.email)
    const status = normalizeStatus(req.body?.status)
    const roleId = normalizePositiveInteger(req.body?.role_id || req.body?.roleId, 0)
    const password = String(req.body?.newPassword || req.body?.password || '')
    const confirmPassword = String(req.body?.confirmPassword || '')

    if (!username) {
        throw badRequest('Введите корректный ник от 2 до 100 символов')
    }

    if (!email) {
        throw badRequest('Введите корректную почту')
    }

    if (!status) {
        throw badRequest('Выберите корректный статус пользователя')
    }

    if (!roleId) {
        throw badRequest('Укажите корректную роль')
    }

    if (password && password !== confirmPassword) {
        throw badRequest('Новый пароль и подтверждение не совпадают')
    }

    if (password && !isStrongPassword(password)) {
        throw badRequest('Пароль должен быть 8-16 символов, с заглавной, строчной буквой и цифрой')
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null

    let user

    try {
        user = await manageAdminUserRepo({
            userId: req.params.userId,
            username,
            email,
            status,
            roleId,
            passwordHash,
            rankPoints: normalizeNonNegativeInteger(req.body?.rankPoints ?? req.body?.rank_points, 0),
            mmr: normalizeNonNegativeInteger(req.body?.mmr, 1000),
            wins: normalizeNonNegativeInteger(req.body?.wins, 0),
            losses: normalizeNonNegativeInteger(req.body?.losses, 0),
            draws: normalizeNonNegativeInteger(req.body?.draws, 0),
            bestSoloScore: normalizeNonNegativeInteger(req.body?.bestSoloScore ?? req.body?.best_solo_score, 0),
            totalMatches: normalizeNonNegativeInteger(req.body?.totalMatches ?? req.body?.total_matches, 0),
        })
    } catch (error) {
        if (error.code === '23505') {
            throw badRequest('Пользователь с такой почтой уже существует')
        }

        if (error.code === '23503') {
            throw badRequest('Указанная роль не найдена')
        }

        throw error
    }

    if (!user) {
        res.status(404).json({
            success: false,
            message: 'Пользователь не найден',
            data: null,
        })
        return
    }

    sendAdminResponse(res, 'Пользователь сохранён', { user })
})

export const updateUserAvatar = asyncHandler(async (req, res) => {
    const user = await updateUserAvatarService({
        userId: req.params.userId,
        contentType: req.get('content-type'),
        buffer: req.body,
    })

    sendAdminResponse(res, 'Аватар пользователя обновлён', { user })
})

export const deleteUserAccount = asyncHandler(async (req, res) => {
    const account = await deleteAdminUserAccountRepo({
        userId: req.params.userId,
        accountId: req.params.accountId,
    })

    if (!account) {
        res.status(404).json({
            success: false,
            message: 'Способ входа не найден',
            data: null,
        })
        return
    }

    sendAdminResponse(res, 'Способ входа удалён', { account })
})

export const deleteUser = asyncHandler(async (req, res) => {
    if (Number(req.params.userId) === Number(req.user.id)) {
        throw badRequest('Нельзя удалить собственный админский аккаунт')
    }

    const user = await deleteAdminUserRepo(req.params.userId)

    if (!user) {
        res.status(404).json({
            success: false,
            message: 'Пользователь не найден',
            data: null,
        })
        return
    }

    sendAdminResponse(res, 'Пользователь удалён', { user })
})

export const getRoles = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Roles loaded', await getAdminResourceRepo('roles', req.query))
})

export const getAuthLogs = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Auth logs loaded', await getAdminResourceRepo('authLogs', req.query))
})

export const getEmailVerifications = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Email verifications loaded', await getAdminResourceRepo('emailVerifications', req.query))
})

export const getMatches = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Matches loaded', await getAdminResourceRepo('matches', req.query))
})

export const getMatchDetails = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Match details loaded', await getAdminResourceRepo('matches', req.query, {
        id: req.params.matchId,
    }))
})

export const getMatchTeams = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Match teams loaded', await getAdminResourceRepo('matchTeams', req.query, {
        match_id: req.params.matchId,
    }))
})

export const getMatchTeamDetails = asyncHandler(async (req, res) => {
    const data = await getAdminMatchTeamDetailsRepo(req.params.teamId)

    if (!data) {
        res.status(404).json({
            success: false,
            message: 'Команда матча не найдена',
            data: null,
        })
        return
    }

    sendAdminResponse(res, 'Match team details loaded', data)
})

export const getMatchPlayers = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Match players loaded', await getAdminResourceRepo('matchPlayers', req.query, {
        match_id: req.params.matchId,
    }))
})

export const getMatchEvents = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Match events loaded', await getAdminResourceRepo('matchEvents', req.query, {
        match_id: req.params.matchId,
    }))
})

export const getGameRooms = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Game rooms loaded', await getAdminResourceRepo('rooms', req.query))
})

export const getGameRoomPlayers = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Game room players loaded', await getAdminResourceRepo('roomPlayers', req.query, {
        room_id: req.params.roomId,
    }))
})

export const getRankStats = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Rank stats loaded', await getAdminResourceRepo('rankStats', req.query))
})

export const getRatingHistory = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Rating history loaded', await getAdminResourceRepo('ratingHistory', req.query))
})

export const getSupportRequests = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Support requests loaded', await getAdminResourceRepo('supportRequests', req.query))
})

export const getSupportRequestDetails = asyncHandler(async (req, res) => {
    const request = await getSupportRequestByIdRepo(req.params.requestId)

    if (!request) {
        res.status(404).json({
            success: false,
            message: 'Support request not found',
            data: null,
        })
        return
    }

    const messages = await getSupportRequestMessagesRepo(request.id)

    sendAdminResponse(res, 'Support request details loaded', {
        request,
        messages,
    })
})

export const replySupportRequest = asyncHandler(async (req, res) => {
    const ticketId = Number.parseInt(req.params.requestId, 10)
    const replyText = String(req.body?.message || req.body?.replyText || '').trim()

    if (!Number.isInteger(ticketId) || ticketId <= 0) {
        throw badRequest('Support request id is invalid')
    }

    if (!replyText) {
        throw badRequest('Reply message is required')
    }

    const result = await replyToSupportRequest({
        ticketId,
        adminLabel: `Admin ${req.user?.username || req.user?.id || ''}`.trim(),
        replyText,
    })

    const request = await getSupportRequestByIdRepo(ticketId)
    const messages = await getSupportRequestMessagesRepo(ticketId)

    sendAdminResponse(res, 'Support reply sent', {
        ...result,
        request,
        messages,
    })
})

export const closeSupportRequestByAdmin = asyncHandler(async (req, res) => {
    const ticketId = Number.parseInt(req.params.requestId, 10)

    const result = await closeSupportRequest({
        ticketId,
    })
    const request = await getSupportRequestByIdRepo(ticketId)
    const messages = await getSupportRequestMessagesRepo(ticketId)

    sendAdminResponse(res, 'Support request closed', {
        ...result,
        request,
        messages,
    })
})

export const getDonations = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Donations loaded', await getAdminResourceRepo('donations', req.query))
})

export const getDonationWallets = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Donation wallets loaded', await getAdminResourceRepo('donationWallets', req.query))
})

export const getDonationVerificationEvents = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Donation verification events loaded', await getAdminResourceRepo('donationVerificationEvents', req.query))
})

export const getAdminAuditLogs = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Admin audit logs loaded', await getAdminResourceRepo('adminAudit', req.query))
})

export const getMigrations = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Migrations loaded', await getAdminResourceRepo('migrations', req.query))
})

export const runMigrations = asyncHandler(async (req, res) => {
    const result = await runPendingMigrations()

    sendAdminResponse(res, 'Migrations completed', result)
})

function normalizeUsername(value) {
    const username = String(value || '').trim().replace(/\s+/g, ' ')

    if (username.length < 2 || username.length > 100) {
        return null
    }

    return username
}

function normalizeEmail(value) {
    const email = String(value || '').trim().toLowerCase()

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return null
    }

    return email
}

function normalizeStatus(value) {
    const status = String(value || '').trim()
    const allowedStatuses = new Set(['active', 'pending_verification', 'blocked', 'disabled'])

    return allowedStatuses.has(status) ? status : null
}

function normalizeTableList(value) {
    if (Array.isArray(value)) {
        return value.map((table) => String(table).trim()).filter(Boolean)
    }

    if (typeof value === 'string') {
        return value.split(',').map((table) => table.trim()).filter(Boolean)
    }

    return []
}

function normalizeUploadBaseName(value) {
    const rawName = path.basename(String(value || 'upload')).replace(/\.[^.]+$/, '')
    const safeName = rawName
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48)

    return safeName || 'upload'
}

function normalizeImportMode(value) {
    const mode = String(value || 'append').trim().toLowerCase()

    if (!['append', 'replace'].includes(mode)) {
        throw badRequest('Invalid database import mode')
    }

    return mode
}

function normalizePositiveInteger(value, fallback) {
    const parsed = Number(value)

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return fallback
    }

    return parsed
}

function normalizeNonNegativeInteger(value, fallback) {
    const parsed = Number(value)

    if (!Number.isFinite(parsed)) {
        return fallback
    }

    return Math.max(0, Math.floor(parsed))
}

function isStrongPassword(password) {
    return (
        typeof password === 'string' &&
        password.length >= 8 &&
        password.length <= 16 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password)
    )
}
