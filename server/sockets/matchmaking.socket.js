import crypto from 'crypto'
import { roomStore } from './roomStore.js'
import {
    attachPlayerToRoomMatchService,
    createRoomMatchService,
    startRoomMatchService,
} from '../services/matchService.js'

const queue = []
const SUPPORTED_MODE = '1v1'
const MATCH_TYPES = new Set(['ranked', 'casual'])

const normalizeBoolean = (value, fallback) => (
    typeof value === 'boolean' ? value : fallback
)

const normalizeSettings = (settings = {}) => ({
    abilitiesEnabled: normalizeBoolean(settings.abilitiesEnabled, true),
    specialBlocksEnabled: normalizeBoolean(settings.specialBlocksEnabled, false),
})

const normalizeMatchType = (value) => (
    MATCH_TYPES.has(value) ? value : 'casual'
)

const isRegisteredUser = (socket) => {
    return socket.data.user?.role !== 'guest' && Number.isInteger(socket.data.user?.id)
}

const createQueuePlayer = (socket) => {
    const user = socket.data.user

    return {
        socketId: socket.id,
        userId: user.id,
        isRegistered: true,
        username: user.username || user.email || 'Player',
        avatarUrl: user.avatarUrl || null,
        rankStats: user.rankStats || null,
        isReady: true,
        gameState: null,
        teamId: null,
        teamNumber: null,
        matchPlayerId: null,
    }
}

const isCompatibleEntry = (entry, candidate) => {
    return entry.socketId !== candidate.socketId &&
        entry.userId !== candidate.userId &&
        entry.modeKey === candidate.modeKey &&
        entry.matchType === candidate.matchType &&
        entry.settings.abilitiesEnabled === candidate.settings.abilitiesEnabled &&
        entry.settings.specialBlocksEnabled === candidate.settings.specialBlocksEnabled
}

const findEntryIndexBySocketId = (socketId) => {
    return queue.findIndex((entry) => entry.socketId === socketId)
}

const removeEntryBySocketId = (socketId) => {
    const index = findEntryIndexBySocketId(socketId)

    if (index === -1) {
        return null
    }

    return queue.splice(index, 1)[0] || null
}

const getQueuePosition = (socketId) => {
    const index = findEntryIndexBySocketId(socketId)

    return index === -1 ? null : index + 1
}

const buildSearchingPayload = (entry) => ({
    modeKey: entry.modeKey,
    matchType: entry.matchType,
    settings: entry.settings,
    joinedAt: entry.joinedAt,
    queueSize: queue.length,
    position: getQueuePosition(entry.socketId),
})

const createMatchedRoom = async ({ io, firstEntry, secondEntry }) => {
    const roomId = crypto.randomUUID()
    const firstPlayer = createQueuePlayer(firstEntry.socket)
    const secondPlayer = createQueuePlayer(secondEntry.socket)
    const firstBinding = await createRoomMatchService({
        roomId,
        player: firstPlayer,
        matchType: firstEntry.matchType,
        countsForRating: firstEntry.matchType === 'ranked',
    })
    const secondBinding = await attachPlayerToRoomMatchService({
        roomId,
        player: secondPlayer,
        teamNumber: 2,
    })
    const room = {
        id: roomId,
        status: 'playing',
        matchId: firstBinding.matchId,
        modeKey: firstEntry.modeKey,
        settings: {
            ...firstEntry.settings,
            matchType: firstEntry.matchType,
        },
        players: [
            {
                ...firstPlayer,
                teamId: firstBinding.teamId,
                teamNumber: firstBinding.teamNumber,
                matchPlayerId: firstBinding.matchPlayerId,
            },
            {
                ...secondPlayer,
                teamId: secondBinding.teamId,
                teamNumber: secondBinding.teamNumber,
                matchPlayerId: secondBinding.matchPlayerId,
            },
        ],
    }

    roomStore.createRoom(room)
    firstEntry.socket.join(roomId)
    secondEntry.socket.join(roomId)
    await startRoomMatchService({ roomId })

    const payload = {
        roomId,
        room,
        modeKey: room.modeKey,
        matchType: firstEntry.matchType,
        settings: room.settings,
    }

    io.to(firstEntry.socketId).emit('matchmaking:found', payload)
    io.to(secondEntry.socketId).emit('matchmaking:found', payload)
    io.to(roomId).emit('room:state', room)
    io.to(roomId).emit('match:start', { roomId })
}

export const removeSocketFromMatchmakingQueue = (socketId) => {
    return removeEntryBySocketId(socketId)
}

export const registerMatchmakingHandlers = (io, socket) => {
    socket.on('matchmaking:join', async (payload = {}, callback) => {
        try {
            if (!isRegisteredUser(socket)) {
                callback?.({
                    success: false,
                    message: 'Поиск матча доступен только авторизованным игрокам',
                })
                return
            }

            if (findEntryIndexBySocketId(socket.id) !== -1) {
                callback?.({
                    success: false,
                    message: 'Вы уже находитесь в очереди поиска',
                })
                return
            }

            if (roomStore.findRoomBySocketId(socket.id)) {
                callback?.({
                    success: false,
                    message: 'Сначала завершите текущую комнату',
                })
                return
            }

            const modeKey = payload.modeKey || SUPPORTED_MODE

            if (modeKey !== SUPPORTED_MODE) {
                callback?.({
                    success: false,
                    message: 'Матчмейкинг пока доступен только для 1v1',
                })
                return
            }

            const entry = {
                socket,
                socketId: socket.id,
                userId: socket.data.user.id,
                username: socket.data.user.username || socket.data.user.email || 'Player',
                modeKey,
                matchType: normalizeMatchType(payload.matchType),
                settings: normalizeSettings(payload.settings),
                joinedAt: new Date().toISOString(),
            }
            const opponentIndex = queue.findIndex((queuedEntry) => isCompatibleEntry(queuedEntry, entry))

            if (opponentIndex === -1) {
                queue.push(entry)

                const searchingPayload = buildSearchingPayload(entry)
                socket.emit('matchmaking:searching', searchingPayload)
                callback?.({
                    success: true,
                    searching: true,
                    ...searchingPayload,
                })
                return
            }

            const opponent = queue.splice(opponentIndex, 1)[0]

            callback?.({
                success: true,
                searching: false,
                message: 'Соперник найден',
            })

            await createMatchedRoom({
                io,
                firstEntry: opponent,
                secondEntry: entry,
            })
        } catch (error) {
            removeEntryBySocketId(socket.id)
            console.error('matchmaking:join error', error)
            callback?.({
                success: false,
                message: 'Не удалось запустить поиск матча',
            })
        }
    })

    socket.on('matchmaking:leave', (_payload = {}, callback) => {
        const removedEntry = removeEntryBySocketId(socket.id)

        socket.emit('matchmaking:cancelled', {
            wasSearching: Boolean(removedEntry),
        })

        callback?.({
            success: true,
            wasSearching: Boolean(removedEntry),
        })
    })
}
