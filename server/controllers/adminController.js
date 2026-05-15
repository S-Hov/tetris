import { asyncHandler } from '../utils/asyncHandler.js'
import bcrypt from 'bcrypt'
import {
    deleteAdminUserAccountRepo,
    deleteAdminUserRepo,
    getAdminDashboardRepo,
    getAdminNavigationRepo,
    getAdminResourceRepo,
    getAdminUserRepo,
    getAdminUserDetailsRepo,
    manageAdminUserRepo,
    updateAdminUserRepo,
} from '../repositories/adminRepository.js'
import { badRequest } from '../helpers/error.helper.js'
import { updateUserAvatarService } from '../services/authService.js'

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
                children: ['Платежи', 'Кошельки', 'Проверки транзакций'],
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

export const getUsers = asyncHandler(async (req, res) => {
    sendAdminResponse(res, 'Users loaded', await getAdminResourceRepo('users', req.query))
})

export const getUserDetails = asyncHandler(async (req, res) => {
    const data = await getAdminUserDetailsRepo(req.params.userId)

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
