import { pool } from '../db/index.js'
import { getActiveSessionWindowMinutes } from './analyticsRepository.js'
import { getRankTier } from '../services/rankRules.js'

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100

const RESOURCE_CONFIGS = {
    users: {
        table: 'users',
        columns: ['id', 'username', 'email', 'avatar_url', 'status', 'role_id', 'created_at', 'last_login_at'],
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
        filters: ['id', 'user_id', 'event_type', 'ip_address'],
        fuzzyFilters: ['event_type'],
        dateRangeColumn: 'created_at',
        orderBy: 'created_at',
        orderDirection: 'DESC',
    },
    emailVerifications: {
        table: 'email_verifications',
        columns: ['id', 'user_id', 'email', 'status', 'attempts_count', 'expires_at', 'verified_at', 'created_at'],
        searchable: ['email', 'status'],
        filters: ['id', 'user_id', 'email', 'status'],
        fuzzyFilters: ['email'],
        dateRangeColumn: 'created_at',
        orderBy: 'created_at',
        orderDirection: 'DESC',
    },
    matches: {
        table: 'matches',
        columns: ['id', 'room_id', 'mode', 'match_type', 'status', 'is_online', 'counts_for_rating', 'winner_team_id', 'started_at', 'ended_at', 'created_at'],
        searchable: ['room_id', 'mode', 'match_type', 'status'],
        filters: ['id', 'room_id', 'mode', 'match_type', 'status', 'counts_for_rating'],
        dateRangeColumn: 'created_at',
        orderBy: 'created_at',
        orderDirection: 'DESC',
    },
    matchTeams: {
        table: 'match_teams',
        columns: ['id', 'match_id', 'team_number', 'team_score', 'result', 'created_at'],
        searchable: ['result'],
        filters: ['id', 'match_id', 'team_number', 'result'],
        dateRangeColumn: 'created_at',
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
        fromSql: 'user_rank_stats LEFT JOIN users ON users.id = user_rank_stats.user_id',
        columns: ['user_id', 'username', 'avatar_url', 'rank_points', 'mmr', 'wins', 'losses', 'draws', 'best_solo_score', 'total_matches', 'created_at', 'updated_at'],
        selectColumns: [
            'user_rank_stats.user_id',
            'users.username',
            'users.avatar_url',
            'user_rank_stats.rank_points',
            'user_rank_stats.mmr',
            'user_rank_stats.wins',
            'user_rank_stats.losses',
            'user_rank_stats.draws',
            'user_rank_stats.best_solo_score',
            'user_rank_stats.total_matches',
            'user_rank_stats.created_at',
            'user_rank_stats.updated_at',
        ],
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
        columns: ['id', 'currency_network_id', 'currency_code', 'network_key', 'network_name', 'address', 'address_label', 'memo_tag', 'status', 'sort_order', 'created_at', 'updated_at'],
        searchable: ['currency_code', 'network_key', 'network_name', 'address', 'address_label'],
        filters: ['currency_code', 'network_key', 'status'],
        editable: true,
        mutableFields: ['currency_network_id', 'currency_code', 'network_key', 'network_name', 'address', 'address_label', 'memo_tag', 'status', 'sort_order', 'metadata'],
        requiredFields: ['currency_code', 'network_key', 'network_name', 'address', 'status'],
        statusField: 'status',
        statusValues: ['active', 'inactive', 'test'],
        orderBy: 'sort_order',
        orderDirection: 'ASC',
    },
    donationCurrencies: {
        table: 'donation_currencies',
        primaryKey: 'code',
        columns: ['code', 'name', 'symbol', 'icon_url', 'icon_symbol', 'decimals', 'status', 'sort_order', 'created_at', 'updated_at'],
        searchable: ['code', 'name', 'symbol'],
        filters: ['code', 'status'],
        editable: true,
        mutableFields: ['code', 'name', 'symbol', 'icon_url', 'icon_symbol', 'decimals', 'status', 'sort_order', 'metadata'],
        requiredFields: ['code', 'name', 'status'],
        statusField: 'status',
        statusValues: ['active', 'inactive'],
        orderBy: 'sort_order',
        orderDirection: 'ASC',
        optional: true,
    },
    donationNetworks: {
        table: 'donation_networks',
        primaryKey: 'key',
        columns: ['key', 'name', 'native_currency_code', 'chain_id', 'explorer_url', 'icon_url', 'icon_symbol', 'status', 'sort_order', 'created_at', 'updated_at'],
        searchable: ['key', 'name', 'native_currency_code', 'chain_id'],
        filters: ['key', 'native_currency_code', 'status'],
        editable: true,
        mutableFields: ['key', 'name', 'native_currency_code', 'chain_id', 'explorer_url', 'icon_url', 'icon_symbol', 'status', 'sort_order', 'metadata'],
        requiredFields: ['key', 'name', 'status'],
        statusField: 'status',
        statusValues: ['active', 'inactive'],
        orderBy: 'sort_order',
        orderDirection: 'ASC',
        optional: true,
    },
    donationCurrencyNetworks: {
        table: 'donation_currency_networks',
        fromSql: `(
            SELECT
                donation_currency_networks.id,
                donation_currency_networks.currency_code,
                donation_currencies.name AS currency_name,
                donation_currency_networks.network_key,
                donation_networks.name AS network_name,
                donation_currency_networks.token_standard,
                donation_currency_networks.contract_address,
                donation_currency_networks.min_confirmations,
                donation_currency_networks.memo_required,
                donation_currency_networks.deposit_enabled,
                donation_currency_networks.status,
                donation_currency_networks.sort_order,
                donation_currency_networks.created_at,
                donation_currency_networks.updated_at
            FROM donation_currency_networks
            LEFT JOIN donation_currencies ON donation_currencies.code = donation_currency_networks.currency_code
            LEFT JOIN donation_networks ON donation_networks.key = donation_currency_networks.network_key
        ) AS donation_currency_networks_view`,
        columns: ['id', 'currency_code', 'currency_name', 'network_key', 'network_name', 'token_standard', 'contract_address', 'min_confirmations', 'memo_required', 'deposit_enabled', 'status', 'sort_order', 'created_at', 'updated_at'],
        searchable: ['currency_code', 'network_key', 'token_standard', 'contract_address'],
        filters: ['currency_code', 'network_key', 'status', 'deposit_enabled'],
        editable: true,
        mutableFields: ['currency_code', 'network_key', 'token_standard', 'contract_address', 'min_confirmations', 'memo_required', 'deposit_enabled', 'status', 'sort_order', 'metadata'],
        requiredFields: ['currency_code', 'network_key', 'status'],
        statusField: 'status',
        statusValues: ['active', 'inactive'],
        orderBy: 'sort_order',
        orderDirection: 'ASC',
        optional: true,
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
        columns: ['id', 'user_id', 'session_key', 'socket_id', 'ip_address', 'user_agent', 'status', 'started_at', 'last_seen_at', 'ended_at'],
        searchable: ['session_key', 'socket_id', 'user_agent', 'status'],
        filters: ['user_id', 'status'],
        dateRanges: [
            { column: 'started_at', from: 'started_from', to: 'started_to' },
            { column: 'last_seen_at', from: 'last_seen_from', to: 'last_seen_to' },
        ],
        orderBy: 'last_seen_at',
        orderDirection: 'DESC',
        optional: true,
    },
    visits: {
        table: 'site_visit_events',
        columns: ['id', 'user_id', 'session_key', 'ip_address', 'user_agent', 'path', 'referrer', 'source', 'device_type', 'occurred_at'],
        searchable: ['session_key', 'path', 'referrer', 'source', 'device_type'],
        filters: ['user_id', 'path', 'source', 'device_type'],
        fuzzyFilters: ['path', 'source'],
        dateRanges: [
            { column: 'occurred_at', from: 'occurred_from', to: 'occurred_to' },
        ],
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

export const createAdminResourceRepo = async (resourceKey, payload = {}) => {
    const config = getMutableResourceConfig(resourceKey)
    const primaryKey = config.primaryKey || 'id'
    const valuesByField = await normalizeMutablePayload(config, payload, { isCreate: true })
    const fields = config.mutableFields.filter((field) => valuesByField[field] !== undefined)

    if (fields.length === 0) {
        throw new Error('No fields to create')
    }

    const values = fields.map((field) => valuesByField[field])
    const columnsSql = fields.join(', ')
    const placeholdersSql = fields.map((_, index) => `$${index + 1}`).join(', ')

    const { rows } = await pool.query(
        `
        INSERT INTO ${config.table} (${columnsSql})
        VALUES (${placeholdersSql})
        RETURNING ${primaryKey}
        `,
        values
    )

    return rows[0]?.[primaryKey] ? await getAdminResourceItemRepo(resourceKey, rows[0][primaryKey]) : null
}

export const updateAdminResourceRepo = async (resourceKey, id, payload = {}) => {
    const config = getMutableResourceConfig(resourceKey)
    const primaryKey = config.primaryKey || 'id'
    const valuesByField = await normalizeMutablePayload(config, payload, { id, isCreate: false })
    const fields = config.mutableFields
        .filter((field) => field !== primaryKey)
        .filter((field) => valuesByField[field] !== undefined)

    if (fields.length === 0) {
        return await getAdminResourceItemRepo(resourceKey, id)
    }

    const values = fields.map((field) => valuesByField[field])
    const setSql = fields.map((field, index) => `${field} = $${index + 1}`).join(', ')

    values.push(id)

    const { rows } = await pool.query(
        `
        UPDATE ${config.table}
        SET ${setSql}, updated_at = NOW()
        WHERE ${primaryKey} = $${values.length}
        RETURNING ${primaryKey}
        `,
        values
    )

    return rows[0]?.[primaryKey] ? await getAdminResourceItemRepo(resourceKey, rows[0][primaryKey]) : null
}

export const updateAdminResourceStatusRepo = async (resourceKey, id, status) => {
    const config = getMutableResourceConfig(resourceKey)
    const primaryKey = config.primaryKey || 'id'
    const statusField = config.statusField

    if (!statusField || !config.statusValues?.includes(status)) {
        throw new Error('Invalid status')
    }

    const { rows } = await pool.query(
        `
        UPDATE ${config.table}
        SET ${statusField} = $1, updated_at = NOW()
        WHERE ${primaryKey} = $2
        RETURNING ${primaryKey}
        `,
        [status, id]
    )

    return rows[0]?.[primaryKey] ? await getAdminResourceItemRepo(resourceKey, rows[0][primaryKey]) : null
}

export const deleteAdminResourceRepo = async (resourceKey, id) => {
    const config = getMutableResourceConfig(resourceKey)
    const primaryKey = config.primaryKey || 'id'

    const { rows } = await pool.query(
        `
        DELETE FROM ${config.table}
        WHERE ${primaryKey} = $1
        RETURNING ${primaryKey}
        `,
        [id]
    )

    return rows[0] || null
}

export const getAdminResourceItemRepo = async (resourceKey, id) => {
    const config = getMutableResourceConfig(resourceKey)
    const primaryKey = config.primaryKey || 'id'
    const columnsSql = (config.selectColumns || config.columns).join(', ')
    const fromSql = config.fromSql || config.table

    const { rows } = await pool.query(
        `
        SELECT ${columnsSql}
        FROM ${fromSql}
        WHERE ${primaryKey} = $1
        LIMIT 1
        `,
        [id]
    )

    return rows[0] || null
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
        seoSources,
        seoPages,
        activeRooms,
    ] = await Promise.all([
        getDashboardMetrics(range),
        getVisitSeries(range, bucketExpression),
        getGameSeries(range, bucketExpression),
        getModeStats(range),
        getSeoTrafficSources(range),
        getSeoPopularPages(range),
        getActiveRoomsSnapshot(),
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
        seo: {
            sources: seoSources,
            pages: seoPages,
        },
        live: {
            rooms: activeRooms,
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
            if (config.fuzzyFilters?.includes(column)) {
                values.push(`%${String(value).trim()}%`)
                where.push(`${column}::text ILIKE $${values.length}`)
            } else {
                values.push(value)
                where.push(`${column} = $${values.length}`)
            }
        }
    })

    const dateRanges = [
        ...(config.dateRangeColumn ? [{ column: config.dateRangeColumn, from: 'created_from', to: 'created_to' }] : []),
        ...(config.dateRanges || []),
    ]

    dateRanges.forEach((dateRange) => {
        if (params[dateRange.from]) {
            values.push(params[dateRange.from])
            where.push(`${dateRange.column} >= $${values.length}`)
        }

        if (params[dateRange.to]) {
            values.push(params[dateRange.to])
            where.push(`${dateRange.column} <= $${values.length}`)
        }
    })

    if (params.search && config.searchable.length > 0) {
        values.push(`%${String(params.search).trim()}%`)
        const index = values.length
        where.push(`(${config.searchable.map((column) => `${column}::text ILIKE $${index}`).join(' OR ')})`)
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    const columnsSql = (config.selectColumns || config.columns).join(', ')
    const fromSql = config.fromSql || config.table
    const orderSql = `${config.orderBy} ${config.orderDirection}`

    const dataQuery = `
        SELECT ${columnsSql}
        FROM ${fromSql}
        ${whereSql}
        ORDER BY ${orderSql}
        LIMIT $${values.length + 1}
        OFFSET $${values.length + 2}
    `
    const countQuery = `
        SELECT COUNT(*)::int AS total
        FROM ${fromSql}
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

export const getAdminUserDetailsRepo = async (userId, params = {}) => {
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
            users.email_verified_at,
            users.password_hash IS NOT NULL AS has_password,
            users.created_at,
            users.updated_at,
            users.last_login_at,
            COALESCE(user_rank_stats.rank_points, 0) AS rank_points,
            COALESCE(user_rank_stats.mmr, 1000) AS mmr,
            COALESCE(user_rank_stats.wins, 0) AS wins,
            COALESCE(user_rank_stats.losses, 0) AS losses,
            COALESCE(user_rank_stats.draws, 0) AS draws,
            COALESCE(user_rank_stats.best_solo_score, 0) AS best_solo_score,
            COALESCE(user_rank_stats.total_matches, 0) AS total_matches
        FROM users
        JOIN roles ON roles.id = users.role_id
        LEFT JOIN user_rank_stats ON user_rank_stats.user_id = users.id
        WHERE users.id = $1
        LIMIT 1
        `,
        [userId]
    )

    const user = rows[0] || null

    if (!user) {
        return null
    }

    const authPage = normalizePositiveInteger(params.auth_page, 1)
    const authLimit = Math.min(normalizePositiveInteger(params.auth_limit, 10), 50)
    const authOffset = (authPage - 1) * authLimit
    const authValues = [userId]
    const authWhere = ['user_id = $1']

    if (params.auth_event_type) {
        authValues.push(params.auth_event_type)
        authWhere.push(`event_type = $${authValues.length}`)
    }

    if (params.auth_created_from) {
        authValues.push(params.auth_created_from)
        authWhere.push(`created_at >= $${authValues.length}`)
    }

    if (params.auth_created_to) {
        authValues.push(params.auth_created_to)
        authWhere.push(`created_at <= $${authValues.length}`)
    }

    const authWhereSql = authWhere.join(' AND ')

    const [summaryResult, matchesResult, ratingHistoryResult, authLogsResult, authLogsCountResult, authEventTypesResult, accountsResult] = await Promise.all([
        pool.query(
            `
            SELECT
                COUNT(*) FILTER (WHERE matches.status IN ('finished', 'abandoned'))::int AS total_games,
                COUNT(*) FILTER (
                    WHERE matches.status IN ('finished', 'abandoned')
                        AND match_players.result = 'win'
                )::int AS wins,
                COUNT(*) FILTER (
                    WHERE matches.status IN ('finished', 'abandoned')
                        AND match_players.result = 'lose'
                )::int AS losses,
                COALESCE(ROUND(AVG(match_players.score)), 0)::int AS avg_score,
                COALESCE(SUM(match_players.lines_cleared), 0)::int AS lines_cleared
            FROM match_players
            JOIN matches ON matches.id = match_players.match_id
            WHERE match_players.user_id = $1
            `,
            [userId]
        ),
        pool.query(
            `
            SELECT
                matches.id,
                matches.room_id,
                matches.mode,
                matches.match_type,
                matches.status,
                matches.counts_for_rating,
                COALESCE(matches.ended_at, matches.created_at) AS played_at,
                match_players.result,
                match_players.score,
                match_players.lines_cleared,
                match_players.level_reached,
                self_team.team_number AS player_team_number,
                self_team.team_score AS player_team_score,
                opponent_data.opponent_label,
                opponent_data.opponent_team_number,
                opponent_data.opponent_team_score
            FROM match_players
            JOIN matches ON matches.id = match_players.match_id
            LEFT JOIN match_teams AS self_team ON self_team.id = match_players.team_id
            LEFT JOIN LATERAL (
                SELECT
                    CASE
                        WHEN COUNT(*) FILTER (WHERE opponent_player.team_id IS DISTINCT FROM match_players.team_id) > 1
                            THEN CONCAT('Команда ', COALESCE(MAX(opponent_team.team_number), 2))
                        ELSE COALESCE(MAX(opponent_user.username), MAX(opponent_player.nickname), 'Неизвестный соперник')
                    END AS opponent_label,
                    COALESCE(MAX(opponent_team.team_number), 2) AS opponent_team_number,
                    COALESCE(MAX(opponent_team.team_score), 0) AS opponent_team_score
                FROM match_players AS opponent_player
                LEFT JOIN users AS opponent_user ON opponent_user.id = opponent_player.user_id
                LEFT JOIN match_teams AS opponent_team ON opponent_team.id = opponent_player.team_id
                WHERE opponent_player.match_id = match_players.match_id
                    AND opponent_player.id <> match_players.id
                    AND opponent_player.team_id IS DISTINCT FROM match_players.team_id
            ) AS opponent_data ON TRUE
            WHERE match_players.user_id = $1
            ORDER BY COALESCE(matches.ended_at, matches.created_at) DESC, matches.id DESC
            LIMIT 20
            `,
            [userId]
        ),
        pool.query(
            `
            SELECT id, match_id, old_rank_points, new_rank_points, rank_delta, old_mmr, new_mmr, mmr_delta, reason, created_at
            FROM rating_history
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 12
            `,
            [userId]
        ),
        pool.query(
            `
            SELECT id, event_type, ip_address, user_agent, created_at
            FROM auth_logs
            WHERE ${authWhereSql}
            ORDER BY created_at DESC
            LIMIT $${authValues.length + 1}
            OFFSET $${authValues.length + 2}
            `,
            [...authValues, authLimit, authOffset]
        ),
        pool.query(
            `
            SELECT COUNT(*)::int AS total
            FROM auth_logs
            WHERE ${authWhereSql}
            `,
            authValues
        ),
        pool.query(
            `
            SELECT DISTINCT event_type
            FROM auth_logs
            WHERE user_id = $1
            ORDER BY event_type ASC
            `,
            [userId]
        ),
        pool.query(
            `
            SELECT id, provider, provider_account_id, created_at, updated_at
            FROM accounts
            WHERE user_id = $1
            ORDER BY provider ASC, created_at DESC
            `,
            [userId]
        ),
    ])

    const totalMatches = Number(user.total_matches) || 0
    const wins = Number(user.wins) || 0
    const summary = summaryResult.rows[0] || {}

    return {
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            avatar_url: user.avatar_url,
            status: user.status,
            role_id: user.role_id,
            role: user.role,
            role_name: user.role_name,
            email_verified_at: user.email_verified_at,
            has_password: Boolean(user.has_password),
            created_at: user.created_at,
            updated_at: user.updated_at,
            last_login_at: user.last_login_at,
        },
        stats: {
            totalGames: Number(summary.total_games) || 0,
            wins: Number(summary.wins) || 0,
            losses: Number(summary.losses) || 0,
            winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
            avgScore: Number(summary.avg_score) || 0,
            linesCleared: Number(summary.lines_cleared) || 0,
        },
        rankStats: {
            rankPoints: Number(user.rank_points) || 0,
            mmr: Number(user.mmr) || 1000,
            wins,
            losses: Number(user.losses) || 0,
            draws: Number(user.draws) || 0,
            totalMatches,
            winRate: totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0,
            bestSoloScore: Number(user.best_solo_score) || 0,
            rank: getRankTier(Number(user.rank_points) || 0),
        },
        matches: matchesResult.rows.map((match) => ({
            id: match.id,
            roomId: match.room_id,
            mode: match.mode,
            matchType: match.match_type,
            status: match.status,
            countsForRating: Boolean(match.counts_for_rating),
            playedAt: match.played_at,
            result: match.result === 'win' ? 'win' : (match.result === 'draw' ? 'draw' : 'loss'),
            score: Number(match.player_team_score ?? match.score) || 0,
            linesCleared: Number(match.lines_cleared) || 0,
            levelReached: Number(match.level_reached) || 1,
            opponent: match.opponent_label || 'Неизвестный соперник',
            opponentTeamNumber: Number(match.opponent_team_number) || null,
            opponentScore: Number(match.opponent_team_score) || 0,
        })),
        ratingHistory: ratingHistoryResult.rows,
        authLogs: authLogsResult.rows,
        authLogsPagination: {
            page: authPage,
            limit: authLimit,
            total: authLogsCountResult.rows[0]?.total || 0,
        },
        authEventTypes: authEventTypesResult.rows.map((row) => row.event_type).filter(Boolean),
        accounts: accountsResult.rows,
    }
}

export const getAdminMatchTeamDetailsRepo = async (teamId) => {
    const [teamResult, playersResult] = await Promise.all([
        pool.query(
            `
            SELECT
                match_teams.id,
                match_teams.match_id,
                match_teams.team_number,
                match_teams.team_score,
                match_teams.result,
                match_teams.created_at,
                matches.room_id,
                matches.mode,
                matches.match_type,
                matches.status AS match_status,
                matches.winner_team_id,
                matches.created_at AS match_created_at,
                matches.ended_at AS match_ended_at
            FROM match_teams
            JOIN matches ON matches.id = match_teams.match_id
            WHERE match_teams.id = $1
            LIMIT 1
            `,
            [teamId]
        ),
        pool.query(
            `
            SELECT
                match_players.id,
                match_players.match_id,
                match_players.team_id,
                match_players.user_id,
                match_players.is_registered,
                match_players.nickname,
                match_players.score,
                match_players.lines_cleared,
                match_players.level_reached,
                match_players.result,
                match_players.joined_at,
                match_players.left_at,
                users.username,
                users.email,
                users.avatar_url
            FROM match_players
            LEFT JOIN users ON users.id = match_players.user_id
            WHERE match_players.team_id = $1
            ORDER BY match_players.score DESC, match_players.id ASC
            `,
            [teamId]
        ),
    ])

    const team = teamResult.rows[0] || null

    if (!team) {
        return null
    }

    return {
        team: {
            id: team.id,
            match_id: team.match_id,
            team_number: team.team_number,
            team_score: Number(team.team_score) || 0,
            result: team.result,
            created_at: team.created_at,
            is_winner: team.winner_team_id === team.id,
        },
        match: {
            id: team.match_id,
            room_id: team.room_id,
            mode: team.mode,
            match_type: team.match_type,
            status: team.match_status,
            created_at: team.match_created_at,
            ended_at: team.match_ended_at,
        },
        players: playersResult.rows.map((player) => ({
            id: player.id,
            match_id: player.match_id,
            team_id: player.team_id,
            user_id: player.user_id,
            is_registered: Boolean(player.is_registered),
            nickname: player.username || player.nickname || 'Guest',
            original_nickname: player.nickname,
            email: player.email,
            avatar_url: player.avatar_url,
            score: Number(player.score) || 0,
            lines_cleared: Number(player.lines_cleared) || 0,
            level_reached: Number(player.level_reached) || 1,
            result: player.result,
            joined_at: player.joined_at,
            left_at: player.left_at,
        })),
    }
}

export const updateAdminUserRepo = async ({ userId, username, email, status }) => {
    const { rows } = await pool.query(
        `
        UPDATE users
        SET
            username = $2,
            email = $3,
            status = $4,
            updated_at = NOW()
        WHERE id = $1
        RETURNING id, username, email, avatar_url, status, role_id, created_at, last_login_at
        `,
        [userId, username, email, status]
    )

    return rows[0] || null
}

export const manageAdminUserRepo = async ({
    userId,
    username,
    email,
    status,
    roleId,
    passwordHash = null,
    rankPoints,
    mmr,
    wins,
    losses,
    draws,
    bestSoloScore,
    totalMatches,
}) => {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        const userResult = await client.query(
            `
            UPDATE users
            SET
                username = $2,
                email = $3,
                status = $4,
                role_id = $5,
                password_hash = COALESCE($6, password_hash),
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, username, email, avatar_url, status, role_id, created_at, last_login_at
            `,
            [userId, username, email, status, roleId, passwordHash]
        )
        const user = userResult.rows[0] || null

        if (!user) {
            await client.query('ROLLBACK')
            return null
        }

        await client.query(
            `
            INSERT INTO user_rank_stats (
                user_id,
                rank_points,
                mmr,
                wins,
                losses,
                draws,
                best_solo_score,
                total_matches
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (user_id) DO UPDATE
            SET
                rank_points = EXCLUDED.rank_points,
                mmr = EXCLUDED.mmr,
                wins = EXCLUDED.wins,
                losses = EXCLUDED.losses,
                draws = EXCLUDED.draws,
                best_solo_score = EXCLUDED.best_solo_score,
                total_matches = EXCLUDED.total_matches,
                updated_at = NOW()
            `,
            [userId, rankPoints, mmr, wins, losses, draws, bestSoloScore, totalMatches]
        )

        await client.query('COMMIT')

        return user
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

export const deleteAdminUserAccountRepo = async ({ userId, accountId }) => {
    const { rows } = await pool.query(
        `
        DELETE FROM accounts
        WHERE user_id = $1 AND id = $2
        RETURNING id, user_id, provider, provider_account_id
        `,
        [userId, accountId]
    )

    return rows[0] || null
}

export const deleteAdminUserRepo = async (userId) => {
    const { rows } = await pool.query(
        `
        DELETE FROM users
        WHERE id = $1
        RETURNING id, username, email
        `,
        [userId]
    )

    return rows[0] || null
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
        getOptionalCountQuery(
            'user_sessions',
            `status IN ('active', 'idle') AND last_seen_at >= NOW() - INTERVAL '${getActiveSessionWindowMinutes()} minutes'`
        ),
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

async function getSeoTrafficSources(range) {
    if (!(await tableExists('site_visit_events'))) {
        return []
    }

    const { rows } = await pool.query(
        `
        SELECT
            COALESCE(NULLIF(source, ''), 'direct') AS source,
            COUNT(*)::int AS visits,
            COUNT(DISTINCT session_key)::int AS sessions
        FROM site_visit_events
        WHERE occurred_at >= $1 AND occurred_at < $2
        GROUP BY COALESCE(NULLIF(source, ''), 'direct')
        ORDER BY visits DESC, source ASC
        LIMIT 8
        `,
        [range.from, range.to]
    )

    return rows
}

async function getSeoPopularPages(range) {
    if (!(await tableExists('site_visit_events'))) {
        return []
    }

    const { rows } = await pool.query(
        `
        SELECT
            split_part(path, '?', 1) AS path,
            COUNT(*)::int AS visits,
            COUNT(DISTINCT session_key)::int AS sessions
        FROM site_visit_events
        WHERE occurred_at >= $1 AND occurred_at < $2
        GROUP BY split_part(path, '?', 1)
        ORDER BY visits DESC, path ASC
        LIMIT 8
        `,
        [range.from, range.to]
    )

    return rows
}

async function getActiveRoomsSnapshot() {
    const { rows } = await pool.query(
        `
        SELECT
            game_rooms.id,
            game_rooms.mode_key,
            game_rooms.status,
            game_rooms.match_id,
            game_rooms.created_at,
            game_rooms.updated_at,
            COUNT(game_room_players.id)::int AS players_count,
            EXTRACT(EPOCH FROM (NOW() - game_rooms.created_at))::int AS duration_seconds
        FROM game_rooms
        LEFT JOIN game_room_players ON game_room_players.room_id = game_rooms.id
        WHERE game_rooms.status <> 'closed'
        GROUP BY game_rooms.id
        ORDER BY game_rooms.updated_at DESC
        LIMIT 8
        `
    )

    return rows
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

function getMutableResourceConfig(resourceKey) {
    const config = RESOURCE_CONFIGS[resourceKey]

    if (!config || !config.editable) {
        throw new Error('Resource is not editable')
    }

    return config
}

async function normalizeMutablePayload(config, payload = {}, { isCreate = false } = {}) {
    const normalized = {}

    for (const field of config.mutableFields) {
        if (!Object.prototype.hasOwnProperty.call(payload, field)) {
            continue
        }

        normalized[field] = normalizeMutableValue(field, payload[field])
    }

    if (config.table === 'donation_wallets') {
        await hydrateDonationWalletPayload(normalized)
    }

    if (config.statusField && normalized[config.statusField] !== undefined && !config.statusValues.includes(normalized[config.statusField])) {
        throw new Error(`Invalid ${config.statusField}`)
    }

    if (isCreate) {
        for (const field of config.requiredFields || []) {
            if (normalized[field] === undefined || normalized[field] === null || normalized[field] === '') {
                throw new Error(`Field ${field} is required`)
            }
        }
    }

    return normalized
}

function normalizeMutableValue(field, value) {
    if (field === 'metadata') {
        if (!value) return '{}'
        if (typeof value === 'string') {
            JSON.parse(value)
            return value
        }

        return JSON.stringify(value)
    }

    if (['sort_order', 'decimals', 'min_confirmations', 'currency_network_id'].includes(field)) {
        if (value === '' || value === null || value === undefined) {
            return null
        }

        return Number.parseInt(value, 10)
    }

    if (['memo_required', 'deposit_enabled'].includes(field)) {
        return value === true || value === 'true' || value === '1' || value === 1
    }

    if (value === '') {
        return null
    }

    if (typeof value === 'string') {
        return value.trim()
    }

    return value
}

async function hydrateDonationWalletPayload(payload) {
    if (!payload.currency_network_id) {
        return
    }

    const { rows } = await pool.query(
        `
        SELECT
            donation_currency_networks.id,
            donation_currency_networks.currency_code,
            donation_currency_networks.network_key,
            donation_networks.name AS network_name
        FROM donation_currency_networks
        JOIN donation_networks ON donation_networks.key = donation_currency_networks.network_key
        WHERE donation_currency_networks.id = $1
        LIMIT 1
        `,
        [payload.currency_network_id]
    )

    const pair = rows[0]

    if (!pair) {
        throw new Error('Currency-network pair not found')
    }

    payload.currency_code = pair.currency_code
    payload.network_key = pair.network_key
    payload.network_name = pair.network_name
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
