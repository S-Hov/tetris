let supportRealtimeIo = null

export const setSupportRealtimeIo = (io) => {
    supportRealtimeIo = io
}

export const getSupportRequestRoom = (requestId) => `support:request:${requestId}`

export const emitSupportRequestMessage = ({ requestId, message, request = null }) => {
    if (!supportRealtimeIo || !requestId || !message) {
        return
    }

    supportRealtimeIo.to(getSupportRequestRoom(requestId)).emit('support:message', {
        requestId: Number(requestId),
        message,
        request,
    })
}

export const emitSupportRequestUpdated = ({ requestId, request }) => {
    if (!supportRealtimeIo || !requestId || !request) {
        return
    }

    supportRealtimeIo.to(getSupportRequestRoom(requestId)).emit('support:updated', {
        requestId: Number(requestId),
        request,
    })
}
