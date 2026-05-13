import { asyncHandler } from '../utils/asyncHandler.js'
import {
    getAdminDashboardRepo,
    getAdminNavigationRepo,
    getAdminResourceRepo,
    getAdminUserRepo,
} from '../repositories/adminRepository.js'

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
    sendAdminResponse(res, 'User details loaded', await getAdminResourceRepo('users', req.query, {
        id: req.params.userId,
    }))
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
