import { pool } from '../db/index.js'

export const TEAM_IDS = ['team_1', 'team_2']

export const getMaxPlayersForMode = (modeKey = '1v1') => (modeKey === '2v2' ? 4 : 2)

export const getTeamSizeForMode = (modeKey = '1v1') => (modeKey === '2v2' ? 2 : 1)

export const getTeamNumberById = (teamId) => {
    const index = TEAM_IDS.indexOf(teamId)

    return index === -1 ? 1 : index + 1
}

export const getTeamIdByNumber = (teamNumber = 1) => TEAM_IDS[teamNumber - 1] || TEAM_IDS[0]

export const getRoomPlayers = (room) => {
    if (!room) {
        return []
    }

    if (Array.isArray(room.players)) {
        return room.players
    }

    return (room.teams || []).flatMap((team) => team.players || [])
}

export const calculateTeamScore = (players = []) => {
    return players.reduce((sum, player) => (
        sum + (Number(player?.gameState?.score) || 0)
    ), 0)
}

export const buildRoomTeams = (players = [], existingTeams = []) => {
    return TEAM_IDS.map((teamId, index) => {
        const previousTeam = existingTeams.find((team) => team.id === teamId) || {}
        const teamPlayers = players.filter((player) => (
            player.teamNumber === index + 1 || player.teamSlot === teamId
        ))

        return {
            ...previousTeam,
            id: teamId,
            players: teamPlayers.map((player) => ({
                ...player,
                teamSlot: teamId,
                teamNumber: index + 1,
            })),
            score: calculateTeamScore(teamPlayers),
        }
    })
}

export const normalizeRoom = (room) => {
    if (!room) {
        return room
    }

    const players = getRoomPlayers(room).map((player, index) => {
        const fallbackTeamNumber = index % 2 === 0 ? 1 : 2
        const teamSlotNumber = TEAM_IDS.includes(player.teamSlot) ? getTeamNumberById(player.teamSlot) : null
        const teamNumber = player.teamNumber || teamSlotNumber || fallbackTeamNumber
        const teamSlot = getTeamIdByNumber(teamNumber)

        return {
            ...player,
            teamNumber,
            teamSlot,
        }
    })

    return {
        ...room,
        players,
        teams: buildRoomTeams(players, room.teams),
    }
}

export const isSocketRoomParticipant = (room, socketOrSocketId) => {
    if (!room || !socketOrSocketId) {
        return false
    }

    const socketId = typeof socketOrSocketId === 'string'
        ? socketOrSocketId
        : socketOrSocketId.id

    return getRoomPlayers(room).some((player) => player.socketId === socketId)
}

export const getRoomPlayerByUserId = (room, userId) => {
    if (!room || !userId) {
        return null
    }

    return getRoomPlayers(room).find((player) => player.userId === userId) || null
}

export const getRoomPlayerBySocketId = (room, socketId) => {
    if (!room || !socketId) {
        return null
    }

    return getRoomPlayers(room).find((player) => player.socketId === socketId) || null
}

const toUserKey = (player) => {
    if (player?.userId) {
        return String(player.userId)
    }

    return player?.socketId ? `socket:${player.socketId}` : null
}

const parseJsonValue = (value, fallback) => {
    if (value === null || value === undefined) {
        return fallback
    }

    if (typeof value === 'object') {
        return value
    }

    try {
        return JSON.parse(value)
    } catch {
        return fallback
    }
}

const mapRoomRow = (roomRow, playerRows = []) => {
    if (!roomRow) {
        return null
    }

    const room = {
        id: roomRow.id,
        status: roomRow.status,
        matchId: roomRow.match_id,
        modeKey: roomRow.mode_key,
        ownerSocketId: roomRow.owner_socket_id,
        ownerUserId: roomRow.owner_user_key,
        settings: parseJsonValue(roomRow.settings, {}),
        players: playerRows.map((playerRow) => ({
            socketId: playerRow.socket_id,
            userId: playerRow.user_id ?? playerRow.user_key,
            isRegistered: Boolean(playerRow.is_registered),
            username: playerRow.username,
            avatarUrl: playerRow.avatar_url,
            rankStats: parseJsonValue(playerRow.rank_stats, null),
            isReady: Boolean(playerRow.is_ready),
            gameState: parseJsonValue(playerRow.game_state, null),
            teamId: playerRow.team_id,
            teamNumber: playerRow.team_number,
            teamSlot: playerRow.team_slot,
            matchPlayerId: playerRow.match_player_id,
        })),
    }

    return normalizeRoom(room)
}

const getRoomByIdWithClient = async (client, roomId, { forUpdate = false } = {}) => {
    const roomResult = await client.query(
        `
        SELECT id, status, match_id, mode_key, owner_socket_id, owner_user_key, settings, metadata,
               created_at, updated_at
        FROM game_rooms
        WHERE id = $1
        ${forUpdate ? 'FOR UPDATE' : ''}
        `,
        [roomId]
    )
    const roomRow = roomResult.rows[0]

    if (!roomRow) {
        return null
    }

    const playersResult = await client.query(
        `
        SELECT id, room_id, socket_id, user_key, user_id, is_registered, username, avatar_url,
               rank_stats, is_ready, game_state, team_id, team_number, team_slot, match_player_id,
               joined_at, updated_at
        FROM game_room_players
        WHERE room_id = $1
        ORDER BY joined_at ASC, id ASC
        ${forUpdate ? 'FOR UPDATE' : ''}
        `,
        [roomId]
    )

    return mapRoomRow(roomRow, playersResult.rows)
}

const persistRoomWithClient = async (client, room) => {
    const normalizedRoom = normalizeRoom(room)
    const players = getRoomPlayers(normalizedRoom)
    const playerSocketIds = players.map((player) => player.socketId).filter(Boolean)

    await client.query(
        `
        INSERT INTO game_rooms (
            id,
            status,
            match_id,
            mode_key,
            owner_socket_id,
            owner_user_key,
            settings,
            metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb)
        ON CONFLICT (id) DO UPDATE
        SET status = EXCLUDED.status,
            match_id = EXCLUDED.match_id,
            mode_key = EXCLUDED.mode_key,
            owner_socket_id = EXCLUDED.owner_socket_id,
            owner_user_key = EXCLUDED.owner_user_key,
            settings = EXCLUDED.settings,
            metadata = EXCLUDED.metadata,
            updated_at = NOW()
        `,
        [
            normalizedRoom.id,
            normalizedRoom.status || 'waiting',
            normalizedRoom.matchId || null,
            normalizedRoom.modeKey || '1v1',
            normalizedRoom.ownerSocketId || null,
            normalizedRoom.ownerUserId ? String(normalizedRoom.ownerUserId) : null,
            JSON.stringify(normalizedRoom.settings || {}),
            JSON.stringify(normalizedRoom.metadata || {}),
        ]
    )

    for (const player of players) {
        const userId = Number.isInteger(player.userId) ? player.userId : null
        const userKey = toUserKey(player)

        await client.query(
            `
            INSERT INTO game_room_players (
                room_id,
                socket_id,
                user_key,
                user_id,
                is_registered,
                username,
                avatar_url,
                rank_stats,
                is_ready,
                game_state,
                team_id,
                team_number,
                team_slot,
                match_player_id,
                metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10::jsonb, $11, $12, $13, $14, $15::jsonb)
            ON CONFLICT (room_id, user_key) DO UPDATE
            SET socket_id = EXCLUDED.socket_id,
                user_id = EXCLUDED.user_id,
                is_registered = EXCLUDED.is_registered,
                username = EXCLUDED.username,
                avatar_url = EXCLUDED.avatar_url,
                rank_stats = EXCLUDED.rank_stats,
                is_ready = EXCLUDED.is_ready,
                game_state = EXCLUDED.game_state,
                team_id = EXCLUDED.team_id,
                team_number = EXCLUDED.team_number,
                team_slot = EXCLUDED.team_slot,
                match_player_id = EXCLUDED.match_player_id,
                metadata = EXCLUDED.metadata,
                updated_at = NOW()
            `,
            [
                normalizedRoom.id,
                player.socketId,
                userKey,
                userId,
                Boolean(player.isRegistered),
                player.username || 'Player',
                player.avatarUrl || null,
                player.rankStats ? JSON.stringify(player.rankStats) : null,
                Boolean(player.isReady),
                player.gameState ? JSON.stringify(player.gameState) : null,
                player.teamId || null,
                player.teamNumber || null,
                player.teamSlot || getTeamIdByNumber(player.teamNumber || 1),
                player.matchPlayerId || null,
                JSON.stringify(player.metadata || {}),
            ]
        )
    }

    if (playerSocketIds.length > 0) {
        await client.query(
            `
            DELETE FROM game_room_players
            WHERE room_id = $1
              AND socket_id <> ALL($2::text[])
            `,
            [normalizedRoom.id, playerSocketIds]
        )
    } else {
        await client.query(
            'DELETE FROM game_room_players WHERE room_id = $1',
            [normalizedRoom.id]
        )
    }

    return await getRoomByIdWithClient(client, normalizedRoom.id)
}

export const roomStore = {
    async createRoom(room) {
        const client = await pool.connect()

        try {
            await client.query('BEGIN')
            const persistedRoom = await persistRoomWithClient(client, room)
            await client.query('COMMIT')

            return persistedRoom
        } catch (error) {
            await client.query('ROLLBACK')
            throw error
        } finally {
            client.release()
        }
    },

    async getRoom(roomId) {
        const client = await pool.connect()

        try {
            return await getRoomByIdWithClient(client, roomId)
        } finally {
            client.release()
        }
    },

    async updateRoom(roomId, updater) {
        const client = await pool.connect()

        try {
            await client.query('BEGIN')
            const room = await getRoomByIdWithClient(client, roomId, { forUpdate: true })

            if (!room) {
                await client.query('COMMIT')
                return null
            }

            const updatedRoom = updater(room)

            if (!updatedRoom) {
                await client.query('COMMIT')
                return null
            }

            const persistedRoom = await persistRoomWithClient(client, updatedRoom)
            await client.query('COMMIT')

            return persistedRoom
        } catch (error) {
            await client.query('ROLLBACK')
            throw error
        } finally {
            client.release()
        }
    },

    async deleteRoom(roomId) {
        await pool.query('DELETE FROM game_rooms WHERE id = $1', [roomId])
    },

    async getAllRooms() {
        const result = await pool.query(
            `
            SELECT id
            FROM game_rooms
            ORDER BY updated_at DESC
            `
        )

        const rooms = []

        for (const row of result.rows) {
            const room = await this.getRoom(row.id)

            if (room) {
                rooms.push(room)
            }
        }

        return rooms
    },

    async findRoomBySocketId(socketId) {
        const result = await pool.query(
            `
            SELECT room_id
            FROM game_room_players
            WHERE socket_id = $1
            ORDER BY updated_at DESC
            LIMIT 1
            `,
            [socketId]
        )
        const roomId = result.rows[0]?.room_id

        return roomId ? await this.getRoom(roomId) : null
    },

    async removePlayerBySocketId(socketId) {
        const room = await this.findRoomBySocketId(socketId)

        if (!room) {
            return null
        }

        const removedPlayer = getRoomPlayers(room).find((player) => player.socketId === socketId) || null
        const players = getRoomPlayers(room).filter((player) => player.socketId !== socketId)

        if (players.length === 0) {
            await this.deleteRoom(room.id)

            return {
                roomId: room.id,
                room: null,
                previousRoom: room,
                removedPlayer,
            }
        }

        const updatedRoom = {
            ...room,
            status: players.length === getMaxPlayersForMode(room.modeKey) ? room.status : 'waiting',
            players,
        }
        const normalizedRoom = await this.createRoom(updatedRoom)

        return {
            roomId: room.id,
            room: normalizedRoom,
            previousRoom: room,
            removedPlayer,
        }
    },

    async updatePlayer(roomId, socketId, updater) {
        return await this.updateRoom(roomId, (room) => ({
            ...room,
            players: getRoomPlayers(room).map((player) => (
                player.socketId === socketId ? updater(player) : player
            )),
        }))
    },
}
