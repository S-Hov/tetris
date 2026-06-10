import { pool } from '../db/index.js'

const TEAM_IDS = ['team_1', 'team_2']

const getTeamIdByNumber = (teamNumber = 1) => TEAM_IDS[teamNumber - 1] || TEAM_IDS[0]

const getRoomPlayers = (room) => {
    if (!room) {
        return []
    }

    if (Array.isArray(room.players)) {
        return room.players
    }

    return (room.teams || []).flatMap((team) => team.players || [])
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

    return {
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
    const players = getRoomPlayers(room)
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
            room.id,
            room.status || 'waiting',
            room.matchId || null,
            room.modeKey || '1v1',
            room.ownerSocketId || null,
            room.ownerUserId ? String(room.ownerUserId) : null,
            JSON.stringify(room.settings || {}),
            JSON.stringify(room.metadata || {}),
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
                room.id,
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
            [room.id, playerSocketIds]
        )
    } else {
        await client.query(
            'DELETE FROM game_room_players WHERE room_id = $1',
            [room.id]
        )
    }

    return await getRoomByIdWithClient(client, room.id)
}

export const createGameRoomRepo = async (room) => {
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
}

export const getGameRoomRepo = async (roomId) => {
    const client = await pool.connect()

    try {
        return await getRoomByIdWithClient(client, roomId)
    } finally {
        client.release()
    }
}

export const updateGameRoomRepo = async (roomId, updater) => {
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
}

export const deleteGameRoomRepo = async (roomId) => {
    await pool.query('DELETE FROM game_rooms WHERE id = $1', [roomId])
}

export const getGameRoomIdsRepo = async () => {
    const result = await pool.query(
        `
        SELECT id
        FROM game_rooms
        ORDER BY updated_at DESC
        `
    )

    return result.rows.map((row) => row.id)
}

export const findGameRoomIdBySocketIdRepo = async (socketId) => {
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

    return result.rows[0]?.room_id || null
}
