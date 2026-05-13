import { pool } from '../db/index.js'

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

const RESOURCE_CONFIGS = {
    users: {
        table: 'users',
        columns: ['id', 'username', 'email', 'status', 'role_id', 'created_at', 'last_login_at'],
        searchable: ['username', 'email'],
        filters: ['status', 'role_id'],
        orderBy: 'created_at',
        orderDirection: 'DESC',
    },
    roles: {
        table: 'roles',
        columns: ['id', 'key', 'name', 'created_at'],
        searchable: ['key', 'name'],
        filters: ['key'],
        orderBy: 'id',
        orderDirection: 'ASC',
    },
    authLogs: {
        table: 'auth_logs',
        columns: ['id', 'user_id', 'event_type', 'ip_address', 'user_agent', 'created_at'],
        searchable: ['event_type', 'user_agent'],
        filters: ['user_id', 'event_type'],
        orderBy: 'created_at',
        orderDirection: 'DESC',
    },
    emailVerifications: {
        table: 'email_verifications',
        columns: ['id', 'user_id', 'email', 'status', 'attempts_count', 'expires_at', 'verified_at', 'created_at'],
        searchable: ['email', 'status'],
        filters: ['user_id', 'status'],
        orderBy: 'created_at',
        orderDirection: 'DESC',
    },
    matches: {
        table: 'matches',
        columns: ['id', 'room_id', 'mode', 'match_type', 'status', 'is_online', 'counts_for_rating', 'winner_team_id', 'started_at', 'ended_at', 'created_at'],
        searchable: ['room_id', 'mode', 'match_type', 'status'],
        filters: ['mode', 'match_type', 'status', 'counts_for_rating'],
        orderBy: 'created_at',
        orderDirection: 'DESC',
    },
    matchTeams: {
        table: 'match_teams',
        columns: ['id', 'match_id', 'team_number', 'team_score', 'result', 'created_at'],
        searchable: ['result'],
        filters: ['match_id', 'result'],
        orderBy: 'id',
        orderDirection: 'DESC',
    },
    matchPlayers: {
        table: 'match_players',
        columns: ['id', 'match_id', 'team_id', 'user_id', 'is_registered', 'nickname', 'score', 'lines_cleared', 'level_reached', 'result', 'joined_at', 'left_at'],
        searchable: ['nickname', 'result'],
        filters: ['match_id', 'team_id', 'user_id', 'result', 'is_registered'],
        orderBy: 'id',
        orderDirection: 'DESC',
    },
    matchEvents: {
        table: 'match_events',
        columns: ['id', 'match_id', 'source_player_id', 'target_player_id', 'event_type', 'payload', 'created_at'],
        searchable: ['event_type'],
        filters: ['match_id', 'event_type'],
        orderBy: 'created_at',
        orderDirection: 'DESC',
    },
    rooms: {
        table: 'game_rooms',
        columns: ['id', 'status', 'match_id', 'mode_key', 'owner_socket_id', 'owner_user_key', 'settings', 'metadata', 'created_at', 'updated_at'],
        searchable: ['id', 'mode_key', 'status', 'owner_user_key'],
        filters: ['status', 'mode_key', 'match_id'],
        orderBy: 'updated_at',
        orderDirection: 'DESC',
    },
    roomPlayers: {
        table: 'game_room_players',
        columns: ['id', 'room_id', 'socket_id', 'user_key', 'user_id', 'is_registered', 'username', 'is_ready', 'team_number', 'team_slot', 'match_player_id', 'joined_at', 'updated_at'],
        searchable: ['room_id', 'user_key', 'username', 'socket_id'],
        filters: ['room_id', 'user_id', 'is_registered', 'is_ready', 'team_number'],
        orderBy: 'updated_at',
        orderDirection: 'DESC',
    },
    rankStats: {
        table: 'user_rank_stats',
        columns: ['user_id', 'rank_points', 'mmr', 'wins', 'losses', 'draws', 'best_solo_score', 'total_matches', 'created_at', 'updated_at'],
        searchable: [],
        filters: ['user_id'],
        orderBy: 'rank_points',
        orderDirection: 'DESC',
    },
    ratingHistory: {
        table: 'rating_history',
        columns: ['id', 'user_id', 'match_id', 'old_rank_points', 'new_rank_points', 'rank_delta', 'old_mmr', 'new_mmr', 'mmr_delta', 'reason', 'created_at'],
        searchable: ['reason'],
        filters: ['user_id', 'match_id', 'reason'],
        orderBy: 'created_at',
        orderDirection: 'DESC',
    },
    supportRequests: {
        table: 'support_requests',
        columns: ['id', 'user_id', 'category', 'status', 'priority', 'contact_name', 'contact_email', 'title', 'page_url', 'resolved_at', 'created_at', 'updated_at'],
        searchable: ['contact_name', 'contact_email', 'title', 'message'],
        filters: ['user_id', 'category', 'status', 'priority'],
        orderBy: 'created_at',
        orderDirection: 'DESC',
    },
    donations: {
        table: 'donations',
        columns: ['id', 'user_id', 'wallet_id', 'donor_name', 'currency_code', 'network_key', 'expected_amount', 'received_amount', 'amount_usd', 'status', 'tx_hash', 'tx_confirmations', 'created_at', 'confirmed_at'],
        searchable: ['donor_name', 'donor_contact', 'currency_code', 'network_key', 'tx_hash', 'status'],
        filters: ['user_id', 'wallet_id', 'currency_code', 'network_key', 'status'],
        orderBy: 'created_at',
        orderDirection: 'DESC',
    },
    donationWallets: {
        table: 'donation_wallets',
        columns: ['id', 'currency_code', 'network_key', 'network_name', 'address', 'address_label', 'memo_tag', 'status', 'sort_order', 'created_at', 'updated_at'],
        searchable: ['currency_code', 'network_key', 'network_name', 'address', 'address_label'],
        filters: ['currency_code', 'network_key', 'status'],
        orderBy: 'sort_order',
        orderDirection: 'ASC',
    },
    donationVerificationEvents: {
        table: 'donation_verification_events',
        columns: ['id', 'donation_id', 'event_type', 'status_from', 'status_to', 'tx_hash', 'confirmations', 'verification_source', 'created_at'],
        searchable: ['event_type', 'tx_hash', 'verification_source'],
        filters: ['donation_id', 'event_type', 'status_to'],
        orderBy: 'created_at',
        orderDirection: 'DESC',
    },
    adminAudit: {
        table: 'admin_audit_logs',
        columns: ['id', 'admin_user_id', 'action', 'entity_type', 'entity_id', 'ip_address', 'user_agent', 'created_at'],
        searchable: ['action', 'entity_type', 'entity_id', 'user_agent'],
        filters: ['admin_user_id', 'action', 'entity_type'],
        orderBy: 'created_at',
        orderDirection: 'DESC',
        optional: true,
    },
    sessions: {
        table: 'user_sessions',
        columns: ['id', 'user_id', 'session_key', 'socket_id', 'ip_address', 'status', 'started_at', 'last_seen_at', 'ended_at'],
        searchable: ['session_key', 'socket_id', 'user_agent', 'status'],
        filters: ['user_id', 'status'],
        orderBy: 'last_seen_at',
        orderDirection: 'DESC',
        optional: true,
    },
    visits: {
        table: 'site_visit_events',
        columns: ['id', 'user_id', 'session_key', 'ip_address', 'path', 'referrer', 'source', 'device_type', 'occurred_at'],
        searchable: ['session_key', 'path', 'referrer', 'source', 'device_type'],
        filters: ['user_id', 'path', 'source', 'device_type'],
        orderBy: 'occurred_at',
        orderDirection: 'DESC',
        optional: true,
    },
    gameActivity: {
        table: 'game_activity_events',
        columns: ['id', 'match_id', 'room_id', 'user_id', 'session_key', 'mode', 'match_type', 'event_type', 'occurred_at'],
        searchable: ['room_id', 'mode', 'match_type', 'event_type'],
        filters: ['match_id', 'room_id', 'user_id', 'mode', 'match_type', 'event_type'],
        orderBy: 'occurred_at',
        orderDirection: 'DESC',
        optional: true,
    },
    migrations: {
        table: 'schema_migrations',
        columns: ['name', 'applied_at'],
        searchable: ['name'],
        filters: [],
        orderBy: 'applied_at',
        orderDirection: 'DESC',
        optional: true,
    },
}

export const getAdminUserRepo = async (userId) => {
    const { rows } = await pool.query(
        `
        SELECT
            users.id,
            users.username,
            users.email,
            users.avatar_url,
            users.status,
            users.role_id,
            roles.key AS role,
            roles.name AS role_name,
            users.created_at,
            users.last_login_at
        FROM users
        JOIN roles ON roles.id = users.role_id
        WHERE users.id = $1
        LIMIT 1
        `,
        [userId]
    )

    return rows[0] || null
}

export const getAdminNavigationRepo = async () => {
    const tableStatuses = await Promise.all(
        Object.entries(RESOURCE_CONFIGS).map(async ([key, config]) => ({
            key,
            table: config.table,
            exists: await tableExists(config.table),
            optional: Boolean(config.optional),
        }))
    )

    return tableStatuses
}

export const getAdminDashboardRepo = async ({ period = 'week', from = null, to = null, groupBy = 'day' } = {}) => {
    const range = normalizeRange({ period, from, to })
    const bucketExpression = getBucketExpression(groupBy)

    const [
        metrics,
        visits,
        games,
        modes,
    ] = await Promise.all([
        getDashboardMetrics(range),
        getVisitSeries(range, bucketExpression),
        getGameSeries(range, bucketExpression),
        getModeStats(range),
    ])

    return {
        period: {
            preset: period,
            from: range.from,
            to: range.to,
            groupBy,
        },
        metrics,
        charts: {
            visits,
            games,
            modes,
        },
    }
}

export const getAdminResourceRepo = async (resourceKey, params = {}, forcedFilters = {}) => {
    const config = RESOURCE_CONFIGS[resourceKey]

    if (!config) {
        return null
    }

    if (config.optional && !(await tableExists(config.table))) {
        return createEmptyResource(resourceKey, config)
    }

    const page = normalizePositiveInteger(params.page, 1)
    const limit = Math.min(normalizePositiveInteger(params.limit, DEFAULT_LIMIT), MAX_LIMIT)
    const offset = (page - 1) * limit
    const values = []
    const where = []
    const mergedFilters = {
        ...params,
        ...forcedFilters,
    }

    const filterColumns = Array.from(new Set([
        ...config.filters,
        ...Object.keys(forcedFilters),
    ])).filter((column) => config.columns.includes(column))

    filterColumns.forEach((column) => {
        const value = mergedFilters[column]

        if (value !== undefined && value !== null && value !== '') {
            values.push(value)
            where.push(`${column} = $${values.length}`)
        }
    })

    if (params.search && config.searchable.length > 0) {
        values.push(`%${String(params.search).trim()}%`)
        const index = values.length
        where.push(`(${config.searchable.map((column) => `${column}::text ILIKE $${index}`).join(' OR ')})`)
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    const columnsSql = config.columns.join(', ')
    const orderSql = `${config.orderBy} ${config.orderDirection}`

    const dataQuery = `
        SELECT ${columnsSql}
        FROM ${config.table}
        ${whereSql}
        ORDER BY ${orderSql}
        LIMIT $${values.length + 1}
        OFFSET $${values.length + 2}
    `
    const countQuery = `
        SELECT COUNT(*)::int AS total
        FROM ${config.table}
        ${whereSql}
    `

    const [dataResult, countResult] = await Promise.all([
        pool.query(dataQuery, [...values, limit, offset]),
        pool.query(countQuery, values),
    ])

    return {
        resource: resourceKey,
        table: config.table,
        columns: config.columns,
        items: dataResult.rows,
        pagination: {
            page,
            limit,
            total: countResult.rows[0]?.total || 0,
        },
    }
}

async function getDashboardMetrics(range) {
    const [usersResult, matchesResult, roomsResult, sessionsResult] = await Promise.all([
        pool.query(
            `
            SELECT
                COUNT(*)::int AS total_users,
                COUNT(*) FILTER (WHERE status = 'active')::int AS active_players
            FROM users
            `
        ),
        pool.query(
            `
            SELECT
                COUNT(*) FILTER (WHERE created_at >= $1 AND created_at < $2)::int AS played_games,
                COUNT(*) FILTER (WHERE status = 'playing')::int AS active_games
            FROM matches
            `,
            [range.from, range.to]
        ),
        pool.query(
            `
            SELECT
                COUNT(*) FILTER (WHERE status <> 'closed')::int AS active_rooms
            FROM game_rooms
            `
        ),
        getOptionalCountQuery('user_sessions', "status IN ('active', 'idle')"),
    ])

    const visits = await getOptionalCountQuery('site_visit_events', 'occurred_at >= $1 AND occurred_at < $2', [range.from, range.to])

    return {
        visits,
        activePlayers: usersResult.rows[0]?.active_players || 0,
        activeSessions: sessionsResult,
        activeRooms: roomsResult.rows[0]?.active_rooms || 0,
        activeGames: matchesResult.rows[0]?.active_games || 0,
        playedGames: matchesResult.rows[0]?.played_games || 0,
        totalUsers: usersResult.rows[0]?.total_users || 0,
    }
}

async function getVisitSeries(range, bucketExpression) {
    if (!(await tableExists('site_visit_events'))) {
        return []
    }

    const { rows } = await pool.query(
        `
        SELECT ${bucketExpression('occurred_at')} AS bucket, COUNT(*)::int AS visits
        FROM site_visit_events
        WHERE occurred_at >= $1 AND occurred_at < $2
        GROUP BY bucket
        ORDER BY bucket ASC
        `,
        [range.from, range.to]
    )

    return rows
}

async function getGameSeries(range, bucketExpression) {
    const { rows } = await pool.query(
        `
        SELECT ${bucketExpression('created_at')} AS bucket, COUNT(*)::int AS games
        FROM matches
        WHERE created_at >= $1 AND created_at < $2
        GROUP BY bucket
        ORDER BY bucket ASC
        `,
        [range.from, range.to]
    )

    return rows
}

async function getModeStats(range) {
    const { rows } = await pool.query(
        `
        SELECT mode, COUNT(*)::int AS games
        FROM matches
        WHERE created_at >= $1 AND created_at < $2
        GROUP BY mode
        ORDER BY games DESC
        `,
        [range.from, range.to]
    )

    return rows
}

async function getOptionalCountQuery(tableName, condition = null, values = []) {
    if (!(await tableExists(tableName))) {
        return 0
    }

    const whereSql = condition ? `WHERE ${condition}` : ''
    const { rows } = await pool.query(
        `SELECT COUNT(*)::int AS total FROM ${tableName} ${whereSql}`,
        values
    )

    return rows[0]?.total || 0
}

async function tableExists(tableName) {
    const { rows } = await pool.query(
        'SELECT to_regclass($1) AS table_name',
        [tableName]
    )

    return Boolean(rows[0]?.table_name)
}

function createEmptyResource(resourceKey, config) {
    return {
        resource: resourceKey,
        table: config.table,
        columns: config.columns,
        items: [],
        pagination: {
            page: 1,
            limit: DEFAULT_LIMIT,
            total: 0,
        },
    }
}

function normalizePositiveInteger(value, fallback) {
    const parsed = Number(value)

    if (!Number.isInteger(parsed) || parsed <= 0) {
        return fallback
    }

    return parsed
}

function normalizeRange({ period, from, to }) {
    const now = new Date()
    const rangeTo = to ? new Date(to) : now
    const rangeFrom = from ? new Date(from) : new Date(rangeTo)

    if (!from) {
        if (period === 'month') {
            rangeFrom.setMonth(rangeFrom.getMonth() - 1)
        } else if (period === 'date') {
            rangeFrom.setHours(0, 0, 0, 0)
        } else {
            rangeFrom.setDate(rangeFrom.getDate() - 7)
        }
    }

    return {
        from: rangeFrom.toISOString(),
        to: rangeTo.toISOString(),
    }
}

function getBucketExpression(groupBy) {
    const bucket = ['month', 'week', 'day'].includes(groupBy) ? groupBy : 'day'

    return (column) => `DATE_TRUNC('${bucket}', ${column})`
}
