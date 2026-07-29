import express from 'express'
import {
    createResourceByKey,
    deleteUserAccount,
    deleteResourceByKey,
    deleteUser,
    getActiveSessions,
    getAdminAuditLogs,
    getAdminMe,
    getAdminNavigation,
    getAuthLogs,
    getDashboardOverview,
    getDatabaseSchema,
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
    getMatchTeamDetails,
    getMatches,
    getMigrations,
    getMatchTeams,
    getRankStats,
    getRatingHistory,
    getResourceByKey,
    getRoles,
    getSupportRequests,
    getSupportRequestDetails,
    getUserDetails,
    getUsers,
    getVisitAnalytics,
    manageUser,
    updateUserAvatar,
    updateResourceByKey,
    updateResourceStatusByKey,
    uploadResourceFileByKey,
    updateUser,
    replySupportRequest,
    closeSupportRequestByAdmin,
    createDatabaseBackup,
    deleteDatabaseBackup,
    downloadDatabaseBackup,
    exportDatabase,
    getDatabaseBackups,
    getDatabaseControl,
    importDatabase,
    restoreDatabaseBackup,
    runMigrations,
} from '../controllers/adminController.js'
import { checkAuth } from '../src/modules/identity/index.js'
import { checkAdmin } from '../middleware/checkAdmin.js'

const adminRouter = express.Router()

adminRouter.use(checkAuth, checkAdmin)

adminRouter.get('/me', getAdminMe)
adminRouter.get('/navigation', getAdminNavigation)
adminRouter.get('/dashboard', getDashboardOverview)
adminRouter.get('/database/schema', getDatabaseSchema)
adminRouter.get('/database/control', getDatabaseControl)
adminRouter.post('/database/export', exportDatabase)
adminRouter.post(
    '/database/import',
    express.raw({
        type: ['application/octet-stream', 'text/plain'],
        limit: '50mb',
    }),
    importDatabase
)
adminRouter.get('/database/backups', getDatabaseBackups)
adminRouter.post('/database/backups', createDatabaseBackup)
adminRouter.get('/database/backups/:fileName/download', downloadDatabaseBackup)
adminRouter.post('/database/backups/:fileName/restore', restoreDatabaseBackup)
adminRouter.delete('/database/backups/:fileName', deleteDatabaseBackup)
adminRouter.get('/analytics/visits', getVisitAnalytics)
adminRouter.get('/analytics/games', getGameAnalytics)
adminRouter.get('/sessions', getActiveSessions)
adminRouter.get('/audit', getAdminAuditLogs)
adminRouter.get('/migrations', getMigrations)
adminRouter.post('/migrations/run', runMigrations)
adminRouter.get('/resources/:resourceKey', getResourceByKey)
adminRouter.post(
    '/resources/:resourceKey/upload',
    express.raw({
        type: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'image/svg+xml'],
        limit: '4mb',
    }),
    uploadResourceFileByKey
)
adminRouter.post('/resources/:resourceKey', createResourceByKey)
adminRouter.patch('/resources/:resourceKey/:resourceId/status', updateResourceStatusByKey)
adminRouter.put('/resources/:resourceKey/:resourceId', updateResourceByKey)
adminRouter.delete('/resources/:resourceKey/:resourceId', deleteResourceByKey)

adminRouter.get('/users', getUsers)
adminRouter.get('/users/:userId', getUserDetails)
adminRouter.patch('/users/:userId/manage', manageUser)
adminRouter.put(
    '/users/:userId/avatar',
    express.raw({
        type: ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'video/webm'],
        limit: '2mb',
    }),
    updateUserAvatar
)
adminRouter.delete('/users/:userId/accounts/:accountId', deleteUserAccount)
adminRouter.put('/users/:userId', updateUser)
adminRouter.delete('/users/:userId', deleteUser)
adminRouter.get('/roles', getRoles)
adminRouter.get('/auth/logs', getAuthLogs)
adminRouter.get('/email-verifications', getEmailVerifications)

adminRouter.get('/matches', getMatches)
adminRouter.get('/match-teams/:teamId', getMatchTeamDetails)
adminRouter.get('/matches/:matchId', getMatchDetails)
adminRouter.get('/matches/:matchId/teams', getMatchTeams)
adminRouter.get('/matches/:matchId/players', getMatchPlayers)
adminRouter.get('/matches/:matchId/events', getMatchEvents)
adminRouter.get('/rooms', getGameRooms)
adminRouter.get('/rooms/:roomId/players', getGameRoomPlayers)

adminRouter.get('/rating/stats', getRankStats)
adminRouter.get('/rating/history', getRatingHistory)

adminRouter.get('/support/requests', getSupportRequests)
adminRouter.get('/support/requests/:requestId', getSupportRequestDetails)
adminRouter.post('/support/requests/:requestId/reply', replySupportRequest)
adminRouter.post('/support/requests/:requestId/close', closeSupportRequestByAdmin)

adminRouter.get('/donations', getDonations)
adminRouter.get('/donations/wallets', getDonationWallets)
adminRouter.get('/donations/verification-events', getDonationVerificationEvents)

export default adminRouter
