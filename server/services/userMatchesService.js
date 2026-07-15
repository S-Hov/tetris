import {
    createSoloRecordMatchRepo,
    getUserMatchDetailsRepo,
    getUserMatchesRepo,
    getUserSoloRecordRepo,
} from '../repositories/matchRepository.js'
import { grantCosmeticItemService } from './cosmeticsService.js'

const MATCH_RESULT_MAP = {
    win: 'win',
    lose: 'loss',
    loss: 'loss',
}

export const getUserMatchesService = async ({
    userId,
    page,
    limit,
    result,
    mode,
    search,
}) => {
    const repositoryResult = await getUserMatchesRepo({
        userId,
        page: toPositiveInteger(page, 1),
        limit: toPositiveInteger(limit, 10),
        result: normalizeListResult(result),
        mode: normalizeMode(mode),
        search: String(search || ''),
    })

    const totalPages = repositoryResult.totalCount > 0
        ? Math.ceil(repositoryResult.totalCount / repositoryResult.limit)
        : 0

    return {
        summary: {
            totalMatches: Number(repositoryResult.summary?.total_matches) || 0,
            wins: Number(repositoryResult.summary?.wins) || 0,
            losses: Number(repositoryResult.summary?.losses) || 0,
            avgLines: Math.round(Number(repositoryResult.summary?.avg_lines) || 0),
            winRate: repositoryResult.summary?.total_matches
                ? Math.round(((Number(repositoryResult.summary?.wins) || 0) / Number(repositoryResult.summary.total_matches)) * 100)
                : 0,
        },
        pagination: {
            page: repositoryResult.page,
            limit: repositoryResult.limit,
            totalCount: repositoryResult.totalCount,
            totalPages,
        },
        matches: repositoryResult.matches.map((match) => ({
            id: match.id,
            roomId: match.room_id,
            mode: match.mode,
            matchType: match.match_type,
            status: match.status,
            playedAt: match.ended_at || match.created_at,
            startedAt: match.started_at,
            endedAt: match.ended_at,
            result: MATCH_RESULT_MAP[match.result] || 'loss',
            score: Number(match.self_team_score ?? match.score) || 0,
            linesCleared: Number(match.lines_cleared) || 0,
            levelReached: Number(match.level_reached) || 1,
            playerTeamNumber: Number(match.self_team_number) || null,
            playerTeamScore: Number(match.self_team_score) || 0,
            opponent: match.opponent_label || 'Неизвестный соперник',
            opponentTeamNumber: Number(match.opponent_team_number) || null,
            opponentTeamScore: Number(match.opponent_team_score) || 0,
        })),
    }
}

export const getUserMatchDetailsService = async ({ userId, matchId }) => {
    const repositoryResult = await getUserMatchDetailsRepo({
        userId,
        matchId: toPositiveInteger(matchId, 0),
    })

    const teams = repositoryResult.teams.map((team) => {
        const players = repositoryResult.players
            .filter((player) => player.team_id === team.id)
            .map((player) => ({
                id: player.id,
                userId: player.user_id,
                teamId: player.team_id,
                nickname: player.username || player.nickname || 'Guest',
                avatarUrl: player.avatar_url || null,
                isRegistered: Boolean(player.is_registered),
                score: Number(player.score) || 0,
                linesCleared: Number(player.lines_cleared) || 0,
                levelReached: Number(player.level_reached) || 1,
                result: MATCH_RESULT_MAP[player.result] || 'loss',
                leftAt: player.left_at,
            }))

        return {
            id: team.id,
            teamNumber: team.team_number,
            teamScore: Number(team.team_score) || 0,
            result: MATCH_RESULT_MAP[team.result] || (team.result || 'none'),
            isWinner: team.id === repositoryResult.match.winner_team_id,
            players,
        }
    })

    return {
        match: {
            id: repositoryResult.match.id,
            roomId: repositoryResult.match.room_id,
            mode: repositoryResult.match.mode,
            matchType: repositoryResult.match.match_type,
            status: repositoryResult.match.status,
            isOnline: Boolean(repositoryResult.match.is_online),
            countsForRating: Boolean(repositoryResult.match.counts_for_rating),
            startedAt: repositoryResult.match.started_at,
            endedAt: repositoryResult.match.ended_at,
            createdAt: repositoryResult.match.created_at,
            updatedAt: repositoryResult.match.updated_at,
            result: MATCH_RESULT_MAP[repositoryResult.match.self_result] || 'loss',
            selfTeamId: repositoryResult.match.self_team_id,
            winnerTeamId: repositoryResult.match.winner_team_id,
            durationSeconds: getDurationSeconds(
                repositoryResult.match.started_at || repositoryResult.match.created_at,
                repositoryResult.match.ended_at || repositoryResult.match.updated_at
            ),
        },
        teams,
        players: teams.flatMap((team) => team.players),
        events: repositoryResult.events.map((event) => ({
            id: event.id,
            eventType: event.event_type,
            payload: event.payload,
            createdAt: event.created_at,
            sourcePlayer: event.source_player_id
                ? {
                    id: event.source_player_id,
                    nickname: event.source_username || event.source_nickname || 'Игрок',
                    avatarUrl: event.source_avatar_url || null,
                }
                : null,
            targetPlayer: event.target_player_id
                ? {
                    id: event.target_player_id,
                    nickname: event.target_username || event.target_nickname || 'Игрок',
                    avatarUrl: event.target_avatar_url || null,
                }
                : null,
        })),
    }
}

export const getUserSoloRecordService = async ({ userId }) => {
    return {
        record: await getUserSoloRecordRepo({ userId }),
    }
}

export const submitSoloResultService = async ({ user, stats }) => {
    const normalizedStats = {
        score: normalizeNonNegativeInteger(stats?.score, 0),
        linesCleared: normalizeNonNegativeInteger(stats?.linesCleared, 0),
        levelReached: normalizePositiveInteger(stats?.levelReached ?? stats?.level, 1),
    }
    const result = await createSoloRecordMatchRepo({
        userId: user.id,
        username: user.username,
        stats: normalizedStats,
    })

    await grantCosmeticItemService({
        attributes: { grantReason: 'first_match', mode: 'solo' },
        itemKey: 'first_match_palette',
        source: 'event',
        sourceRef: 'first-match-reward',
        userId: user.id,
    })

    return {
        ...result,
        isNewRecord: Boolean(result.saved),
    }
}

const toPositiveInteger = (value, fallback) => {
    const parsed = Number.parseInt(value, 10)

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return fallback
    }

    return parsed
}

const normalizeNonNegativeInteger = (value, fallback) => {
    const parsed = Number(value)

    if (!Number.isFinite(parsed)) {
        return fallback
    }

    return Math.max(0, Math.floor(parsed))
}

const normalizePositiveInteger = (value, fallback) => {
    const parsed = Number(value)

    if (!Number.isFinite(parsed)) {
        return fallback
    }

    return Math.max(1, Math.floor(parsed))
}

const normalizeListResult = (value) => {
    if (value === 'win' || value === 'loss') {
        return value
    }

    return 'all'
}

const normalizeMode = (value) => {
    const normalized = String(value || '').trim()

    return normalized || 'all'
}

const getDurationSeconds = (startedAt, endedAt) => {
    const started = new Date(startedAt).getTime()
    const ended = new Date(endedAt).getTime()

    if (Number.isNaN(started) || Number.isNaN(ended) || ended < started) {
        return 0
    }

    return Math.round((ended - started) / 1000)
}
