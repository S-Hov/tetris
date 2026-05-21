import { pool } from '../db/index.js'
import { getActiveSessionWindowMinutes } from './analyticsRepository.js'
import { getRankTier } from '../services/rankRules.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const DEFAULT_LIMIT = 25
const MAX_LIMIT = 100
const BACKUP_FORMAT_VERSION = 1
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DATABASE_BACKUPS_DIR = path.resolve(__dirname, '..', 'backups', 'database')

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
    gameEffects: {
        table: 'game_effects',
        columns: ['id', 'effect_key', 'label', 'label_ru', 'title', 'title_ru', 'description', 'description_ru', 'icon', 'image_url', 'visual', 'duration_ms', 'status', 'sort_order', 'created_at', 'updated_at'],
        searchable: ['effect_key', 'label', 'label_ru', 'title', 'title_ru', 'description', 'description_ru', 'icon', 'visual'],
        filters: ['status', 'effect_key', 'visual'],
        editable: true,
        mutableFields: ['effect_key', 'label', 'label_ru', 'title', 'title_ru', 'description', 'description_ru', 'icon', 'image_url', 'visual', 'duration_ms', 'status', 'sort_order', 'metadata'],
        requiredFields: ['effect_key', 'label', 'label_ru', 'title', 'title_ru', 'status'],
        statusField: 'status',
        statusValues: ['active', 'inactive'],
        orderBy: 'sort_order',
        orderDirection: 'ASC',
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
        columns: ['id', 'user_id', 'category', 'status', 'priority', 'preferred_channel', 'contact_name', 'contact_email', 'title', 'telegram_url', 'telegram_user_id', 'telegram_chat_id', 'telegram_username', 'telegram_linked_at', 'page_url', 'resolved_at', 'created_at', 'updated_at'],
        selectColumns: [
            'id',
            'user_id',
            'category',
            'status',
            'priority',
            'preferred_channel',
            'contact_name',
            'contact_email',
            `CASE category
                WHEN 'bug' THEN 'Ошибка в игре'
                WHEN 'idea' THEN 'Идея или предложение'
                WHEN 'mode' THEN 'Игровой режим'
                WHEN 'balance' THEN 'Баланс'
                ELSE 'Другое обращение'
            END AS title`,
            'telegram_url',
            'telegram_user_id',
            'telegram_chat_id',
            `CASE
                WHEN NULLIF(telegram_username, '') IS NOT NULL THEN CONCAT('@', telegram_username)
                WHEN NULLIF(telegram_user_id, '') IS NOT NULL THEN CONCAT('tg:', telegram_user_id)
                WHEN NULLIF(telegram_chat_id, '') IS NOT NULL THEN CONCAT('chat:', telegram_chat_id)
                ELSE NULL
            END AS telegram_username`,
            'telegram_linked_at',
            'page_url',
            'resolved_at',
            'created_at',
            'updated_at',
        ],
        searchable: ['contact_name', 'contact_email', 'title', 'message'],
        filters: ['user_id', 'category', 'status', 'priority', 'preferred_channel'],
        orderBy: 'created_at',
        orderDirection: 'DESC',
    },
    supportBlocks: {
        table: 'support_user_blocks',
        fromSql: `(
            SELECT
                support_user_blocks.id,
                support_user_blocks.user_id,
                users.username,
                users.email,
                support_user_blocks.status,
                support_user_blocks.reason,
                support_user_blocks.blocked_until,
                support_user_blocks.blocked_by_user_id,
                support_user_blocks.created_at,
                support_user_blocks.updated_at
            FROM support_user_blocks
            LEFT JOIN users ON users.id = support_user_blocks.user_id
        ) AS support_user_blocks_view`,
        columns: ['id', 'user_id', 'username', 'email', 'status', 'reason', 'blocked_until', 'blocked_by_user_id', 'created_at', 'updated_at'],
        searchable: ['reason', 'username', 'email'],
        filters: ['user_id', 'status'],
        editable: true,
        mutableFields: ['user_id', 'status', 'reason', 'blocked_by_user_id', 'blocked_until'],
        requiredFields: ['user_id', 'status'],
        statusField: 'status',
        statusValues: ['active', 'inactive'],
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

export const getDatabaseSchemaRepo = async () => {
    const [tablesResult, columnsResult, constraintsResult] = await Promise.all([
        pool.query(
            `
            SELECT
                pg_class.oid,
                pg_class.relname AS table_name,
                COALESCE(pg_stat_user_tables.n_live_tup, 0)::bigint AS estimated_rows,
                pg_total_relation_size(pg_class.oid)::bigint AS total_bytes,
                pg_size_pretty(pg_total_relation_size(pg_class.oid)) AS total_size
            FROM pg_class
            JOIN pg_namespace ON pg_namespace.oid = pg_class.relnamespace
            LEFT JOIN pg_stat_user_tables ON pg_stat_user_tables.relid = pg_class.oid
            WHERE pg_namespace.nspname = 'public'
                AND pg_class.relkind = 'r'
            ORDER BY pg_class.relname ASC
            `
        ),
        pool.query(
            `
            SELECT
                table_name,
                column_name,
                ordinal_position,
                data_type,
                udt_name,
                character_maximum_length,
                numeric_precision,
                numeric_scale,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_schema = 'public'
            ORDER BY table_name ASC, ordinal_position ASC
            `
        ),
        pool.query(
            `
            SELECT
                tc.constraint_name,
                tc.constraint_type,
                kcu.table_name,
                kcu.column_name,
                kcu.ordinal_position,
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name,
                rc.update_rule,
                rc.delete_rule
            FROM information_schema.table_constraints tc
            LEFT JOIN information_schema.key_column_usage kcu
                ON kcu.constraint_schema = tc.constraint_schema
                AND kcu.constraint_name = tc.constraint_name
                AND kcu.table_schema = tc.table_schema
            LEFT JOIN information_schema.constraint_column_usage ccu
                ON ccu.constraint_schema = tc.constraint_schema
                AND ccu.constraint_name = tc.constraint_name
            LEFT JOIN information_schema.referential_constraints rc
                ON rc.constraint_schema = tc.constraint_schema
                AND rc.constraint_name = tc.constraint_name
            WHERE tc.table_schema = 'public'
                AND tc.constraint_type IN ('PRIMARY KEY', 'UNIQUE', 'FOREIGN KEY')
            ORDER BY tc.table_name ASC, tc.constraint_name ASC, kcu.ordinal_position ASC
            `
        ),
    ])

    const rowCounts = await getTableRowCounts(tablesResult.rows.map((table) => table.table_name))
    const constraints = buildDatabaseConstraints(constraintsResult.rows)
    const constraintsByTable = new Map()

    constraints.forEach((constraint) => {
        if (!constraintsByTable.has(constraint.table)) {
            constraintsByTable.set(constraint.table, [])
        }

        constraintsByTable.get(constraint.table).push(constraint)
    })

    const columnsByTable = new Map()

    columnsResult.rows.forEach((column) => {
        if (!columnsByTable.has(column.table_name)) {
            columnsByTable.set(column.table_name, [])
        }

        columnsByTable.get(column.table_name).push(column)
    })

    const tables = tablesResult.rows.map((table) => {
        const tableConstraints = constraintsByTable.get(table.table_name) || []

        return {
            name: table.table_name,
            rowCount: rowCounts.get(table.table_name) ?? Number(table.estimated_rows) ?? 0,
            estimatedRows: Number(table.estimated_rows) || 0,
            totalBytes: Number(table.total_bytes) || 0,
            totalSize: table.total_size,
            columns: (columnsByTable.get(table.table_name) || []).map((column) => ({
                name: column.column_name,
                type: formatDatabaseColumnType(column),
                nullable: column.is_nullable === 'YES',
                defaultValue: column.column_default,
                primaryKey: tableConstraints.some((constraint) => constraint.type === 'PRIMARY KEY' && constraint.columns.includes(column.column_name)),
                unique: tableConstraints.some((constraint) => constraint.type === 'UNIQUE' && constraint.columns.includes(column.column_name)),
                foreignKey: tableConstraints.some((constraint) => constraint.type === 'FOREIGN KEY' && constraint.columns.includes(column.column_name)),
            })),
            constraints: tableConstraints,
        }
    })

    const relationships = constraints
        .filter((constraint) => constraint.type === 'FOREIGN KEY')
        .map((constraint) => ({
            name: constraint.name,
            fromTable: constraint.table,
            fromColumns: constraint.columns,
            toTable: constraint.foreignTable,
            toColumns: constraint.foreignColumns,
            updateRule: constraint.updateRule,
            deleteRule: constraint.deleteRule,
        }))

    return {
        stats: {
            tableCount: tables.length,
            rowCount: tables.reduce((sum, table) => sum + Number(table.rowCount || 0), 0),
            relationshipCount: relationships.length,
            totalBytes: tables.reduce((sum, table) => sum + Number(table.totalBytes || 0), 0),
        },
        tables,
        relationships,
    }
}

export const getDatabaseControlRepo = async () => {
    const [schema, backups] = await Promise.all([
        getDatabaseSchemaRepo(),
        listDatabaseBackupsRepo(),
    ])

    return {
        stats: schema.stats,
        tables: schema.tables.map((table) => ({
            name: table.name,
            rowCount: table.rowCount,
            totalBytes: table.totalBytes,
            totalSize: table.totalSize,
            columnsCount: table.columns.length,
        })),
        backups,
        limits: {
            importBytes: 50 * 1024 * 1024,
            formatVersion: BACKUP_FORMAT_VERSION,
        },
    }
}

export const exportDatabaseDataRepo = async ({ tables = [] } = {}) => {
    const tableNames = await normalizeDatabaseTableSelection(tables)

    return buildDatabaseExport(tableNames)
}

export const createDatabaseBackupRepo = async ({ tables = [] } = {}) => {
    const exportData = await exportDatabaseDataRepo({ tables })
    await ensureDatabaseBackupsDir()

    const scope = exportData.scope === 'all'
        ? 'all'
        : exportData.tables.map((table) => table.name).join('-').replace(/[^a-z0-9_-]+/gi, '_').slice(0, 80)
    const fileName = `${new Date().toISOString().replace(/[:.]/g, '-')}_${scope || 'selected'}.json`
    const filePath = path.join(DATABASE_BACKUPS_DIR, fileName)

    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8')

    return getDatabaseBackupInfo(filePath, fileName)
}

export const listDatabaseBackupsRepo = async () => {
    await ensureDatabaseBackupsDir()

    const entries = await fs.readdir(DATABASE_BACKUPS_DIR, { withFileTypes: true })
    const backups = await Promise.all(entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
        .map((entry) => getDatabaseBackupInfo(path.join(DATABASE_BACKUPS_DIR, entry.name), entry.name)))

    return backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export const getDatabaseBackupPathRepo = async (fileName) => {
    const safeFileName = normalizeBackupFileName(fileName)
    const filePath = path.join(DATABASE_BACKUPS_DIR, safeFileName)
    await fs.access(filePath)

    return filePath
}

export const deleteDatabaseBackupRepo = async (fileName) => {
    const safeFileName = normalizeBackupFileName(fileName)
    const filePath = path.join(DATABASE_BACKUPS_DIR, safeFileName)
    await fs.unlink(filePath)

    return { fileName: safeFileName }
}

export const importDatabaseDataRepo = async ({ payload, mode = 'append', tables = [] } = {}) => {
    const parsedPayload = parseDatabaseImportPayload(payload)
    const selectedTables = tables.length > 0
        ? await normalizeDatabaseTableSelection(tables)
        : await normalizeDatabaseTableSelection(parsedPayload.tables.map((table) => table.name))
    const allowedTables = new Set(selectedTables)
    const importTables = parsedPayload.tables.filter((table) => allowedTables.has(table.name))

    if (importTables.length === 0) {
        throw new Error('No tables selected for import')
    }

    return importDatabaseTables(importTables, mode)
}

export const restoreDatabaseBackupRepo = async ({ fileName, mode = 'replace', tables = [] } = {}) => {
    const filePath = await getDatabaseBackupPathRepo(fileName)
    const payload = await fs.readFile(filePath, 'utf8')

    return importDatabaseDataRepo({ payload, mode, tables })
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

async function getTableRowCounts(tableNames) {
    if (tableNames.length === 0) {
        return new Map()
    }

    const queries = tableNames.map((tableName) => {
        const safeTableName = quoteIdentifier(tableName)

        return `SELECT ${quoteLiteral(tableName)} AS table_name, COUNT(*)::bigint AS row_count FROM ${safeTableName}`
    })

    const { rows } = await pool.query(queries.join(' UNION ALL '))

    return new Map(rows.map((row) => [row.table_name, Number(row.row_count) || 0]))
}

async function normalizeDatabaseTableSelection(tables = []) {
    const availableTables = await getPublicTableNames()
    const requestedTables = [...new Set((tables || []).map((table) => String(table).trim()).filter(Boolean))]

    if (requestedTables.length === 0) {
        return availableTables
    }

    const availableSet = new Set(availableTables)
    const unknownTables = requestedTables.filter((table) => !availableSet.has(table))

    if (unknownTables.length > 0) {
        throw new Error(`Unknown tables: ${unknownTables.join(', ')}`)
    }

    return requestedTables
}

async function getPublicTableNames() {
    const { rows } = await pool.query(
        `
        SELECT tablename AS table_name
        FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename ASC
        `
    )

    return rows.map((row) => row.table_name)
}

async function buildDatabaseExport(tableNames) {
    const exportedTables = []
    let totalRows = 0

    for (const tableName of tableNames) {
        const columns = await getDatabaseTableColumns(tableName)
        const { rows } = await pool.query(`SELECT * FROM ${quoteIdentifier(tableName)}`)

        exportedTables.push({
            name: tableName,
            columns,
            rowCount: rows.length,
            rows,
        })

        totalRows += rows.length
    }

    return {
        format: 'pvp-tetris-database-backup',
        formatVersion: BACKUP_FORMAT_VERSION,
        createdAt: new Date().toISOString(),
        database: process.env.DB_DATABASE || process.env.LOCAL_DB_DATABASE || null,
        scope: tableNames.length === (await getPublicTableNames()).length ? 'all' : 'selected',
        stats: {
            tableCount: exportedTables.length,
            rowCount: totalRows,
        },
        tables: exportedTables,
    }
}

async function getDatabaseTableColumns(tableName) {
    const { rows } = await pool.query(
        `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
            AND table_name = $1
        ORDER BY ordinal_position ASC
        `,
        [tableName]
    )

    return rows.map((row) => row.column_name)
}

async function importDatabaseTables(tables, mode) {
    const normalizedMode = ['append', 'replace'].includes(mode) ? mode : 'append'
    const client = await pool.connect()
    const imported = []
    const tableNames = tables.map((table) => table.name)
    const [orderedTableNames, nullableForeignKeys, primaryKeys] = await Promise.all([
        sortTablesForImport(tableNames),
        getNullableForeignKeyColumns(tableNames),
        getPrimaryKeyColumns(tableNames),
    ])
    const tablesByName = new Map(tables.map((table) => [table.name, table]))
    const orderedTables = orderedTableNames.map((tableName) => tablesByName.get(tableName)).filter(Boolean)
    const deferredUpdates = []

    try {
        await client.query('BEGIN')
        await client.query('SET CONSTRAINTS ALL DEFERRED')

        if (normalizedMode === 'replace') {
            const truncateSql = tables.map((table) => quoteIdentifier(table.name)).join(', ')
            await client.query(`TRUNCATE ${truncateSql} RESTART IDENTITY CASCADE`)
        }

        for (const table of orderedTables) {
            const columns = table.columns?.length ? table.columns : Object.keys(table.rows?.[0] || {})
            const safeColumns = columns.map(quoteIdentifier)
            const nullableFkColumns = nullableForeignKeys.get(table.name) || []
            const primaryKeyColumns = primaryKeys.get(table.name) || []

            for (const row of table.rows || []) {
                const values = columns.map((column) => nullableFkColumns.includes(column) ? null : (row[column] ?? null))
                const placeholders = values.map((_, index) => `$${index + 1}`).join(', ')

                await client.query(
                    `INSERT INTO ${quoteIdentifier(table.name)} (${safeColumns.join(', ')}) VALUES (${placeholders})`,
                    values
                )

                if (nullableFkColumns.length > 0 && primaryKeyColumns.length > 0) {
                    const updateValues = nullableFkColumns.map((column) => row[column] ?? null)
                    const whereValues = primaryKeyColumns.map((column) => row[column] ?? null)

                    if (whereValues.every((value) => value !== null && value !== undefined)) {
                        deferredUpdates.push({
                            tableName: table.name,
                            setColumns: nullableFkColumns,
                            updateValues,
                            whereColumns: primaryKeyColumns,
                            whereValues,
                        })
                    }
                }
            }

            imported.push({
                name: table.name,
                rowCount: (table.rows || []).length,
            })
        }

        for (const update of deferredUpdates) {
            const setSql = update.setColumns.map((column, index) => `${quoteIdentifier(column)} = $${index + 1}`).join(', ')
            const whereSql = update.whereColumns
                .map((column, index) => `${quoteIdentifier(column)} = $${update.updateValues.length + index + 1}`)
                .join(' AND ')

            await client.query(
                `UPDATE ${quoteIdentifier(update.tableName)} SET ${setSql} WHERE ${whereSql}`,
                [...update.updateValues, ...update.whereValues]
            )
        }

        await client.query('COMMIT')

        return {
            mode: normalizedMode,
            imported,
            stats: {
                tableCount: imported.length,
                rowCount: imported.reduce((sum, table) => sum + table.rowCount, 0),
            },
        }
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

async function sortTablesForImport(tableNames) {
    const tableSet = new Set(tableNames)
    const dependencies = new Map(tableNames.map((tableName) => [tableName, new Set()]))

    const { rows } = await pool.query(
        `
        SELECT
            kcu.table_name,
            ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON kcu.constraint_schema = tc.constraint_schema
            AND kcu.constraint_name = tc.constraint_name
            AND kcu.table_schema = tc.table_schema
        JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_schema = tc.constraint_schema
            AND ccu.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public'
            AND tc.constraint_type = 'FOREIGN KEY'
        `
    )

    rows.forEach((row) => {
        if (tableSet.has(row.table_name) && tableSet.has(row.foreign_table_name) && row.table_name !== row.foreign_table_name) {
            dependencies.get(row.table_name)?.add(row.foreign_table_name)
        }
    })

    const sorted = []
    const temporary = new Set()
    const permanent = new Set()

    const visit = (tableName) => {
        if (permanent.has(tableName)) return
        if (temporary.has(tableName)) return

        temporary.add(tableName)
        ;(dependencies.get(tableName) || []).forEach(visit)
        temporary.delete(tableName)
        permanent.add(tableName)
        sorted.push(tableName)
    }

    tableNames.forEach(visit)

    return sorted
}

async function getNullableForeignKeyColumns(tableNames) {
    if (tableNames.length === 0) {
        return new Map()
    }

    const { rows } = await pool.query(
        `
        SELECT
            kcu.table_name,
            kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON kcu.constraint_schema = tc.constraint_schema
            AND kcu.constraint_name = tc.constraint_name
            AND kcu.table_schema = tc.table_schema
        JOIN information_schema.columns columns
            ON columns.table_schema = kcu.table_schema
            AND columns.table_name = kcu.table_name
            AND columns.column_name = kcu.column_name
        WHERE tc.table_schema = 'public'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND columns.is_nullable = 'YES'
            AND kcu.table_name = ANY($1)
        `,
        [tableNames]
    )

    const columnsByTable = new Map()

    rows.forEach((row) => {
        if (!columnsByTable.has(row.table_name)) {
            columnsByTable.set(row.table_name, [])
        }

        columnsByTable.get(row.table_name).push(row.column_name)
    })

    return columnsByTable
}

async function getPrimaryKeyColumns(tableNames) {
    if (tableNames.length === 0) {
        return new Map()
    }

    const { rows } = await pool.query(
        `
        SELECT
            kcu.table_name,
            kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON kcu.constraint_schema = tc.constraint_schema
            AND kcu.constraint_name = tc.constraint_name
            AND kcu.table_schema = tc.table_schema
        WHERE tc.table_schema = 'public'
            AND tc.constraint_type = 'PRIMARY KEY'
            AND kcu.table_name = ANY($1)
        ORDER BY kcu.table_name ASC, kcu.ordinal_position ASC
        `,
        [tableNames]
    )

    const columnsByTable = new Map()

    rows.forEach((row) => {
        if (!columnsByTable.has(row.table_name)) {
            columnsByTable.set(row.table_name, [])
        }

        columnsByTable.get(row.table_name).push(row.column_name)
    })

    return columnsByTable
}

function parseDatabaseImportPayload(payload) {
    const text = Buffer.isBuffer(payload) ? payload.toString('utf8') : String(payload || '')
    const parsed = JSON.parse(text)

    if (parsed?.format !== 'pvp-tetris-database-backup' || parsed?.formatVersion !== BACKUP_FORMAT_VERSION || !Array.isArray(parsed.tables)) {
        throw new Error('Unsupported database backup format')
    }

    return parsed
}

async function ensureDatabaseBackupsDir() {
    await fs.mkdir(DATABASE_BACKUPS_DIR, { recursive: true })
}

async function getDatabaseBackupInfo(filePath, fileName) {
    const stat = await fs.stat(filePath)
    let metadata = null

    try {
        const content = await fs.readFile(filePath, 'utf8')
        const parsed = JSON.parse(content)
        metadata = {
            createdAt: parsed.createdAt,
            scope: parsed.scope,
            tableCount: parsed.stats?.tableCount || parsed.tables?.length || 0,
            rowCount: parsed.stats?.rowCount || 0,
            tables: (parsed.tables || []).map((table) => table.name),
        }
    } catch {
        metadata = null
    }

    return {
        fileName,
        sizeBytes: stat.size,
        size: formatBytesForBackup(stat.size),
        createdAt: metadata?.createdAt || stat.birthtime.toISOString(),
        updatedAt: stat.mtime.toISOString(),
        scope: metadata?.scope || 'unknown',
        tableCount: metadata?.tableCount || 0,
        rowCount: metadata?.rowCount || 0,
        tables: metadata?.tables || [],
    }
}

function normalizeBackupFileName(fileName) {
    const safeFileName = path.basename(String(fileName || ''))

    if (!safeFileName || safeFileName !== fileName || !safeFileName.endsWith('.json')) {
        throw new Error('Invalid backup file name')
    }

    return safeFileName
}

function formatBytesForBackup(bytes) {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = Number(bytes) || 0
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex += 1
    }

    return `${size.toFixed(size >= 10 ? 0 : 1)} ${units[unitIndex]}`
}

function buildDatabaseConstraints(rows) {
    const constraints = new Map()

    rows.forEach((row) => {
        if (!row.constraint_name || !row.table_name) {
            return
        }

        const key = `${row.table_name}:${row.constraint_name}`
        const current = constraints.get(key) || {
            name: row.constraint_name,
            type: row.constraint_type,
            table: row.table_name,
            columns: [],
            foreignTable: row.foreign_table_name || null,
            foreignColumns: [],
            updateRule: row.update_rule || null,
            deleteRule: row.delete_rule || null,
        }

        if (row.column_name && !current.columns.includes(row.column_name)) {
            current.columns.push(row.column_name)
        }

        if (row.foreign_column_name && !current.foreignColumns.includes(row.foreign_column_name)) {
            current.foreignColumns.push(row.foreign_column_name)
        }

        constraints.set(key, current)
    })

    return [...constraints.values()]
}

function formatDatabaseColumnType(column) {
    const dataType = column.data_type === 'USER-DEFINED' ? column.udt_name : column.data_type

    if (column.character_maximum_length) {
        return `${dataType}(${column.character_maximum_length})`
    }

    if (column.numeric_precision && column.numeric_scale !== null) {
        return `${dataType}(${column.numeric_precision}, ${column.numeric_scale})`
    }

    return dataType
}

function quoteIdentifier(value) {
    return `"${String(value).replace(/"/g, '""')}"`
}

function quoteLiteral(value) {
    return `'${String(value).replace(/'/g, "''")}'`
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

    if (config.table === 'game_effects') {
        hydrateGameEffectPayload(normalized)
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

function hydrateGameEffectPayload(payload) {
    if (payload.description === null || payload.description === undefined) {
        payload.description = ''
    }

    if (payload.description_ru === null || payload.description_ru === undefined) {
        payload.description_ru = ''
    }

    if (payload.icon === null || payload.icon === undefined) {
        payload.icon = 'fa-bolt'
    }

    if (payload.visual === null || payload.visual === undefined) {
        payload.visual = 'default'
    }

    if (payload.duration_ms === null || payload.duration_ms === undefined) {
        payload.duration_ms = 4000
    }

    if (payload.sort_order === null || payload.sort_order === undefined) {
        payload.sort_order = 0
    }
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

    if (['sort_order', 'decimals', 'min_confirmations', 'currency_network_id', 'duration_ms'].includes(field)) {
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
