import { asyncHandler } from '../utils/asyncHandler.js'
import {
    getConnectionsService,
    unlinkConnectionService,
} from '../services/oauthService.js'

export const getConnections = asyncHandler(async (req, res) => {
    const connections = await getConnectionsService(req.user.id)

    res.json({
        success: true,
        message: 'Connections fetched successfully',
        data: connections,
    })
})

export const unlinkConnection = asyncHandler(async (req, res) => {
    const connections = await unlinkConnectionService({
        userId: req.user.id,
        provider: req.params.provider,
    })

    res.json({
        success: true,
        message: 'Подключение удалено',
        data: connections,
    })
})
