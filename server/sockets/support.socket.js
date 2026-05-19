import { getSupportRequestByIdRepo } from '../repositories/supportRepository.js'
import { getSupportRequestRoom } from '../services/supportRealtimeService.js'

const isAdminSocket = (socket) => socket.data.user?.role === 'admin'

const normalizeRequestId = (value) => {
    const requestId = Number.parseInt(value, 10)

    return Number.isInteger(requestId) && requestId > 0 ? requestId : null
}

export const registerSupportHandlers = (io, socket) => {
    socket.on('support:join', async (payload = {}, callback) => {
        try {
            if (!isAdminSocket(socket)) {
                callback?.({ success: false, message: 'Admin access required' })
                return
            }

            const requestId = normalizeRequestId(payload.requestId)

            if (!requestId) {
                callback?.({ success: false, message: 'Support request id is invalid' })
                return
            }

            const request = await getSupportRequestByIdRepo(requestId)

            if (!request) {
                callback?.({ success: false, message: 'Support request not found' })
                return
            }

            await socket.join(getSupportRequestRoom(requestId))
            callback?.({ success: true, requestId })
        } catch (error) {
            callback?.({ success: false, message: error.message || 'Could not join support request' })
        }
    })

    socket.on('support:leave', async (payload = {}, callback) => {
        const requestId = normalizeRequestId(payload.requestId)

        if (requestId) {
            await socket.leave(getSupportRequestRoom(requestId))
        }

        callback?.({ success: true })
    })
}
