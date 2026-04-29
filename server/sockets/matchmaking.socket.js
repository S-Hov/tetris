import crypto from 'crypto'
import {
    getTeamIdByNumber,
    roomStore,
} from './roomStore.js'
import {
    attachPlayerToRoomMatchService,
    createRoomMatchService,
    startRoomMatchService,
} from '../services/matchService.js'

const queue = []
const parties = new Map()
const SUPPORTED_MODE = '1v1'
const TEAM_MODE = '2v2'
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

const getEntrySocketIds = (entry) => entry.players.map((player) => player.socketId)

const getEntryUserIds = (entry) => entry.players.map((player) => player.userId)

const haveSharedPlayer = (entry, candidate) => {
    const entrySocketIds = new Set(getEntrySocketIds(entry))
    const entryUserIds = new Set(getEntryUserIds(entry))

    return candidate.players.some((player) => (
        entrySocketIds.has(player.socketId) || entryUserIds.has(player.userId)
    ))
}

const isCompatibleEntry = (entry, candidate) => {
    return !haveSharedPlayer(entry, candidate) &&
        entry.modeKey === candidate.modeKey &&
        entry.matchType === candidate.matchType &&
        entry.settings.abilitiesEnabled === candidate.settings.abilitiesEnabled &&
        entry.settings.specialBlocksEnabled === candidate.settings.specialBlocksEnabled
}

const findEntryIndexBySocketId = (socketId) => {
    return queue.findIndex((entry) => getEntrySocketIds(entry).includes(socketId))
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
    position: Math.min(...getEntrySocketIds(entry).map((socketId) => getQueuePosition(socketId)).filter(Boolean)),
    teamSize: entry.players.length,
    neededTeamSize: entry.modeKey === TEAM_MODE ? 2 : 1,
})

const emitSearchingToEntry = (io, entry) => {
    const payload = buildSearchingPayload(entry)

    for (const player of entry.players) {
        io.to(player.socketId).emit('matchmaking:searching', payload)
    }
}

const createMatchedRoom = async ({ io, firstEntry, secondEntry }) => {
    const roomId = crypto.randomUUID()
    const players = []
    let matchId = null

    for (const [entryIndex, entry] of [firstEntry, secondEntry].entries()) {
        const teamNumber = entryIndex + 1

        for (const [playerIndex, player] of entry.players.entries()) {
            const { socket: _socket, ...roomPlayer } = player
            const binding = entryIndex === 0 && playerIndex === 0
                ? await createRoomMatchService({
                    roomId,
                    player: roomPlayer,
                    matchMode: firstEntry.modeKey,
                    matchType: firstEntry.matchType,
                    countsForRating: firstEntry.matchType === 'ranked',
                })
                : await attachPlayerToRoomMatchService({
                    roomId,
                    player: roomPlayer,
                    teamNumber,
                })

            matchId = matchId || binding.matchId
            players.push({
                ...roomPlayer,
                teamId: binding.teamId,
                teamNumber: binding.teamNumber,
                teamSlot: getTeamIdByNumber(binding.teamNumber),
                matchPlayerId: binding.matchPlayerId,
            })
        }
    }

    const room = {
        id: roomId,
        status: 'playing',
        matchId,
        modeKey: firstEntry.modeKey,
        settings: {
            ...firstEntry.settings,
            matchType: firstEntry.matchType,
        },
        players,
    }

    const normalizedRoom = roomStore.createRoom(room)

    for (const entry of [firstEntry, secondEntry]) {
        for (const player of entry.players) {
            player.socket.join(roomId)
        }
    }

    await startRoomMatchService({ roomId })

    const payload = {
        roomId,
        room: normalizedRoom,
        modeKey: normalizedRoom.modeKey,
        matchType: firstEntry.matchType,
        settings: normalizedRoom.settings,
    }

    for (const player of [...firstEntry.players, ...secondEntry.players]) {
        io.to(player.socketId).emit('matchmaking:found', payload)
    }

    io.to(roomId).emit('room:state', normalizedRoom)
    io.to(roomId).emit('match:start', { roomId })
}

const createEntryFromSockets = ({ sockets, modeKey, matchType, settings, source = 'solo' }) => ({
    id: crypto.randomUUID(),
    players: sockets.map((entrySocket) => ({
        ...createQueuePlayer(entrySocket),
        socket: entrySocket,
    })),
    modeKey,
    matchType,
    settings,
    source,
    joinedAt: new Date().toISOString(),
})

const createEntryFromSocket = (socket, payload = {}) => createEntryFromSockets({
    sockets: [socket],
    modeKey: payload.modeKey || SUPPORTED_MODE,
    matchType: normalizeMatchType(payload.matchType),
    settings: normalizeSettings(payload.settings),
    source: 'solo',
})

const getTargetTeamSize = (modeKey) => (modeKey === TEAM_MODE ? 2 : 1)

const findCompatibleEntryIndex = (candidate, predicate = () => true) => (
    queue.findIndex((queuedEntry) => isCompatibleEntry(queuedEntry, candidate) && predicate(queuedEntry))
)

const enqueueOrMatchEntry = async (io, entry) => {
    const targetTeamSize = getTargetTeamSize(entry.modeKey)

    if (entry.players.length < targetTeamSize) {
        const teammateIndex = findCompatibleEntryIndex(entry, (queuedEntry) => (
            queuedEntry.players.length + entry.players.length === targetTeamSize
        ))

        if (teammateIndex === -1) {
            queue.push(entry)
            emitSearchingToEntry(io, entry)
            return { searching: true, entry }
        }

        const teammateEntry = queue.splice(teammateIndex, 1)[0]
        const teamEntry = {
            ...entry,
            id: crypto.randomUUID(),
            players: [...teammateEntry.players, ...entry.players],
            source: 'matched-team',
            joinedAt: teammateEntry.joinedAt,
        }
        const opponentIndex = findCompatibleEntryIndex(teamEntry, (queuedEntry) => queuedEntry.players.length === targetTeamSize)

        if (opponentIndex === -1) {
            queue.push(teamEntry)
            emitSearchingToEntry(io, teamEntry)
            return { searching: true, entry: teamEntry, message: 'Союзник найден. Ищем команду соперников' }
        }

        const opponentEntry = queue.splice(opponentIndex, 1)[0]

        await createMatchedRoom({ io, firstEntry: opponentEntry, secondEntry: teamEntry })
        return { searching: false }
    }

    const opponentIndex = findCompatibleEntryIndex(entry, (queuedEntry) => queuedEntry.players.length === targetTeamSize)

    if (opponentIndex === -1) {
        queue.push(entry)
        emitSearchingToEntry(io, entry)
        return { searching: true, entry }
    }

    const opponentEntry = queue.splice(opponentIndex, 1)[0]

    await createMatchedRoom({ io, firstEntry: opponentEntry, secondEntry: entry })
    return { searching: false }
}

export const removeSocketFromMatchmakingQueue = (socketId) => {
    return removeEntryBySocketId(socketId)
}

const getPartyPlayers = (party) => party.players.map((player) => ({
    socketId: player.socket.id,
    userId: player.socket.data.user.id,
    username: player.socket.data.user.username || player.socket.data.user.email || 'Player',
    avatarUrl: player.socket.data.user.avatarUrl || null,
    isOwner: player.socket.id === party.ownerSocketId,
}))

const serializeParty = (party) => ({
    id: party.id,
    ownerSocketId: party.ownerSocketId,
    ownerUserId: party.ownerUserId,
    modeKey: party.modeKey,
    settings: party.settings,
    status: party.status,
    players: getPartyPlayers(party),
})

const emitPartyState = (io, party) => {
    const payload = serializeParty(party)

    for (const player of party.players) {
        io.to(player.socket.id).emit('party:state', payload)
    }
}

const findPartyBySocketId = (socketId) => (
    Array.from(parties.values()).find((party) => (
        party.players.some((player) => player.socket.id === socketId)
    )) || null
)

const leavePartyBySocketId = (io, socketId) => {
    const party = findPartyBySocketId(socketId)

    if (!party) {
        return null
    }

    party.players = party.players.filter((player) => player.socket.id !== socketId)

    if (party.players.length === 0) {
        parties.delete(party.id)
        return party
    }

    if (party.ownerSocketId === socketId) {
        party.ownerSocketId = party.players[0].socket.id
        party.ownerUserId = party.players[0].socket.data.user.id
    }

    emitPartyState(io, party)
    return party
}

export const removeSocketFromParties = (io, socketId) => {
    return leavePartyBySocketId(io, socketId)
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

            if (modeKey !== SUPPORTED_MODE && modeKey !== TEAM_MODE) {
                callback?.({
                    success: false,
                    message: 'Матчмейкинг пока доступен только для 1v1 и 2v2',
                })
                return
            }

            const entry = createEntryFromSocket(socket, {
                ...payload,
                modeKey,
            })
            const result = await enqueueOrMatchEntry(io, entry)

            callback?.({
                success: true,
                searching: result.searching,
                ...(result.entry ? buildSearchingPayload(result.entry) : {}),
                message: result.message || (result.searching ? 'Поиск матча запущен' : 'Матч найден'),
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

    socket.on('matchmaking:leave', async (_payload = {}, callback) => {
        const removedEntry = removeEntryBySocketId(socket.id)

        if (removedEntry) {
            const isSystemMatchedTeam = removedEntry.source === 'matched-team' && removedEntry.players.length > 1
            const remainingPlayers = removedEntry.players.filter((player) => player.socketId !== socket.id)

            socket.emit('matchmaking:cancelled', {
                wasSearching: true,
            })

            if (isSystemMatchedTeam && remainingPlayers.length > 0) {
                const requeuedEntry = {
                    ...removedEntry,
                    id: crypto.randomUUID(),
                    players: remainingPlayers,
                    source: 'solo',
                    joinedAt: new Date().toISOString(),
                }

                await enqueueOrMatchEntry(io, requeuedEntry)
            } else {
                for (const player of remainingPlayers) {
                    io.to(player.socketId).emit('matchmaking:cancelled', {
                        wasSearching: true,
                    })
                }
            }
        } else {
            socket.emit('matchmaking:cancelled', {
                wasSearching: false,
            })
        }

        callback?.({
            success: true,
            wasSearching: Boolean(removedEntry),
        })
    })

    socket.on('party:create', (payload = {}, callback) => {
        if (!isRegisteredUser(socket)) {
            callback?.({ success: false, message: 'Командное лобби доступно только авторизованным игрокам' })
            return
        }

        if (findPartyBySocketId(socket.id)) {
            callback?.({ success: false, message: 'Вы уже в командном лобби' })
            return
        }

        const party = {
            id: crypto.randomUUID(),
            ownerSocketId: socket.id,
            ownerUserId: socket.data.user.id,
            modeKey: payload.modeKey || TEAM_MODE,
            settings: normalizeSettings(payload.settings),
            status: 'idle',
            players: [{ socket }],
        }

        parties.set(party.id, party)
        emitPartyState(io, party)
        callback?.({ success: true, message: 'Лобби союзников создано', party: serializeParty(party) })
    })

    socket.on('party:join', ({ partyId } = {}, callback) => {
        if (!isRegisteredUser(socket)) {
            callback?.({ success: false, message: 'Командное лобби доступно только авторизованным игрокам' })
            return
        }

        if (!partyId) {
            callback?.({ success: false, message: 'Party ID is required' })
            return
        }

        const party = parties.get(partyId)

        if (!party) {
            callback?.({ success: false, message: 'Лобби союзников не найдено' })
            return
        }

        if (party.status === 'searching') {
            callback?.({ success: false, message: 'Команда уже ищет матч' })
            return
        }

        if (party.players.some((player) => player.socket.data.user.id === socket.data.user.id)) {
            callback?.({ success: true, party: serializeParty(party) })
            return
        }

        if (party.players.length >= 2) {
            callback?.({ success: false, message: 'В команде уже два игрока' })
            return
        }

        leavePartyBySocketId(io, socket.id)
        party.players.push({ socket })
        emitPartyState(io, party)
        callback?.({ success: true, message: 'Вы присоединились к союзнику', party: serializeParty(party) })
    })

    socket.on('party:leave', (_payload = {}, callback) => {
        const party = leavePartyBySocketId(io, socket.id)

        callback?.({ success: true, left: Boolean(party) })
    })

    socket.on('party:start-search', async ({ partyId, matchType = 'casual' } = {}, callback) => {
        try {
            const party = parties.get(partyId)

            if (!party) {
                callback?.({ success: false, message: 'Лобби союзников не найдено' })
                return
            }

            if (party.ownerSocketId !== socket.id) {
                callback?.({ success: false, message: 'Поиск запускает лидер команды' })
                return
            }

            if (party.players.length !== 2) {
                callback?.({ success: false, message: 'Для поиска парой нужен союзник' })
                return
            }

            if (party.players.some((player) => findEntryIndexBySocketId(player.socket.id) !== -1)) {
                callback?.({ success: false, message: 'Команда уже находится в поиске' })
                return
            }

            const entry = createEntryFromSockets({
                sockets: party.players.map((player) => player.socket),
                modeKey: party.modeKey,
                matchType: normalizeMatchType(matchType),
                settings: party.settings,
                source: 'party',
            })
            party.status = 'searching'
            emitPartyState(io, party)

            const result = await enqueueOrMatchEntry(io, entry)

            callback?.({
                success: true,
                searching: result.searching,
                ...(result.entry ? buildSearchingPayload(result.entry) : {}),
                message: result.searching ? 'Ищем команду соперников' : 'Матч найден',
            })
        } catch (error) {
            removeEntryBySocketId(socket.id)
            console.error('party:start-search error', error)
            callback?.({ success: false, message: 'Не удалось начать командный поиск' })
        }
    })

    socket.on('party:cancel-search', ({ partyId } = {}, callback) => {
        const party = parties.get(partyId)
        const removedEntry = removeEntryBySocketId(socket.id)

        if (party) {
            party.status = 'idle'
            emitPartyState(io, party)
        }

        if (removedEntry) {
            for (const player of removedEntry.players) {
                io.to(player.socketId).emit('matchmaking:cancelled', {
                    wasSearching: true,
                })
            }
        }

        callback?.({ success: true, wasSearching: Boolean(removedEntry) })
    })
}
