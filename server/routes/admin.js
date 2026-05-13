import express from 'express'
import {
    getActiveSessions,
    getAdminAuditLogs,
    getAdminMe,
    getAdminNavigation,
    getAuthLogs,
    getDashboardOverview,
    getDonationVerificationEvents,
    getDonationWallets,
    getDonations,
    getEmailVerifications,
    getGameAnalytics,
    getGameRoomPlayers,
    getGameRooms,
    getMatchDetails,
    getMatchEvents,
    getMatchPlayers,
    getMatches,
    getMigrations,
    getMatchTeams,
    getRankStats,
    getRatingHistory,
    getResourceByKey,
    getRoles,
    getSupportRequests,
    getUserDetails,
    getUsers,
    getVisitAnalytics,
} from '../controllers/adminController.js'
import { checkAuth } from '../middleware/checkAuth.js'
import { checkAdmin } from '../middleware/checkAdmin.js'

const adminRouter = express.Router()

adminRouter.use(checkAuth, checkAdmin)

adminRouter.get('/me', getAdminMe)
adminRouter.get('/navigation', getAdminNavigation)
adminRouter.get('/dashboard', getDashboardOverview)
adminRouter.get('/analytics/visits', getVisitAnalytics)
adminRouter.get('/analytics/games', getGameAnalytics)
adminRouter.get('/sessions', getActiveSessions)
adminRouter.get('/audit', getAdminAuditLogs)
adminRouter.get('/migrations', getMigrations)
adminRouter.get('/resources/:resourceKey', getResourceByKey)

adminRouter.get('/users', getUsers)
adminRouter.get('/users/:userId', getUserDetails)
adminRouter.get('/roles', getRoles)
adminRouter.get('/auth/logs', getAuthLogs)
adminRouter.get('/email-verifications', getEmailVerifications)

adminRouter.get('/matches', getMatches)
adminRouter.get('/matches/:matchId', getMatchDetails)
adminRouter.get('/matches/:matchId/teams', getMatchTeams)
adminRouter.get('/matches/:matchId/players', getMatchPlayers)
adminRouter.get('/matches/:matchId/events', getMatchEvents)
adminRouter.get('/rooms', getGameRooms)
adminRouter.get('/rooms/:roomId/players', getGameRoomPlayers)

adminRouter.get('/rating/stats', getRankStats)
adminRouter.get('/rating/history', getRatingHistory)

adminRouter.get('/support/requests', getSupportRequests)

adminRouter.get('/donations', getDonations)
adminRouter.get('/donations/wallets', getDonationWallets)
adminRouter.get('/donations/verification-events', getDonationVerificationEvents)

export default adminRouter
