import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { pool } from '../db/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const migrationsDir = path.join(serverRoot, 'migrations')

const MIGRATIONS_TABLE = 'schema_migrations'
const MIGRATION_LOCK_KEY = 'pvp_tetris_schema_migrations'

const shouldUseAdvisoryLock = () => {
    const databaseUrl = process.env.DATABASE_URL || ''
    const host = (() => {
        try {
            return new URL(databaseUrl).host
        } catch {
            return process.env.DB_HOST || ''
        }
    })()

    return !host.includes('pooler.supabase.')
}

const ensureMigrationsTable = async (client) => {
    await client.query(`
        CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
            name TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    `)
}

const getMigrationFiles = async () => {
    const entries = await readdir(migrationsDir, { withFileTypes: true })

    return entries
        .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
        .map((entry) => entry.name)
        .sort((left, right) => left.localeCompare(right))
}

const getAppliedMigrationNames = async (client) => {
    const result = await client.query(`
        SELECT name
        FROM ${MIGRATIONS_TABLE}
        ORDER BY name ASC
    `)

    return new Set(result.rows.map((row) => row.name))
}

const tableExists = async (client, tableName) => {
    const result = await client.query(
        `
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = $1
        ) AS exists
        `,
        [tableName]
    )

    return Boolean(result.rows[0]?.exists)
}

const columnExists = async (client, tableName, columnName) => {
    const result = await client.query(
        `
        SELECT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = $1
              AND column_name = $2
        ) AS exists
        `,
        [tableName, columnName]
    )

    return Boolean(result.rows[0]?.exists)
}

const isColumnNullable = async (client, tableName, columnName) => {
    const result = await client.query(
        `
        SELECT is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = $1
          AND column_name = $2
        LIMIT 1
        `,
        [tableName, columnName]
    )

    return result.rows[0]?.is_nullable === 'YES'
}

const hasRoleKeys = async (client, keys) => {
    const result = await client.query(
        `
        SELECT key
        FROM roles
        WHERE key = ANY($1::text[])
        `,
        [keys]
    )

    return keys.every((key) => result.rows.some((row) => row.key === key))
}

const MIGRATION_BASELINE_CHECKS = {
    '001_auth_schema.sql': async (client) => {
        const requiredTables = ['roles', 'users', 'email_verifications', 'auth_logs']
        const results = await Promise.all(requiredTables.map((tableName) => tableExists(client, tableName)))

        return results.every(Boolean)
    },
    '002_seed_roles.sql': async (client) => {
        if (!(await tableExists(client, 'roles'))) {
            return false
        }

        return hasRoleKeys(client, ['user', 'admin'])
    },
    '003_match_schema.sql': async (client) => {
        const requiredTables = ['matches', 'match_teams', 'match_players', 'match_events']
        const results = await Promise.all(requiredTables.map((tableName) => tableExists(client, tableName)))

        return results.every(Boolean)
    },
    '004_add_matches_room_id.sql': async (client) => {
        return columnExists(client, 'matches', 'room_id')
    },
    '005_rating_schema.sql': async (client) => {
        const requiredTables = ['user_rank_stats', 'rating_history']
        const results = await Promise.all(requiredTables.map((tableName) => tableExists(client, tableName)))

        return results.every(Boolean)
    },
    '006_game_rooms_schema.sql': async (client) => {
        const requiredTables = ['game_rooms', 'game_room_players']
        const results = await Promise.all(requiredTables.map((tableName) => tableExists(client, tableName)))

        return results.every(Boolean)
    },
    '007_support_and_donations_schema.sql': async (client) => {
        const requiredTables = ['support_requests', 'donation_wallets', 'donations', 'donation_verification_events']
        const results = await Promise.all(requiredTables.map((tableName) => tableExists(client, tableName)))

        return results.every(Boolean)
    },
    '008_admin_analytics_schema.sql': async (client) => {
        const requiredTables = ['site_visit_events', 'user_sessions', 'game_activity_events', 'admin_audit_logs']
        const results = await Promise.all(requiredTables.map((tableName) => tableExists(client, tableName)))

        return results.every(Boolean)
    },
    '009_oauth_accounts_schema.sql': async (client) => {
        const [accountsExists, emailNullable, passwordHashNullable] = await Promise.all([
            tableExists(client, 'accounts'),
            isColumnNullable(client, 'users', 'email'),
            isColumnNullable(client, 'users', 'password_hash'),
        ])

        return accountsExists && emailNullable && passwordHashNullable
    },
}

const detectBaselineMigrations = async (client, files) => {
    const detected = []

    for (const file of files) {
        const check = MIGRATION_BASELINE_CHECKS[file]

        if (!check) {
            break
        }

        const matchesSchema = await check(client)

        if (!matchesSchema) {
            break
        }

        detected.push(file)
    }

    return detected
}

const recordAppliedMigrations = async (client, names) => {
    if (names.length === 0) {
        return
    }

    await client.query('BEGIN')

    try {
        for (const name of names) {
            await client.query(
                `
                INSERT INTO ${MIGRATIONS_TABLE} (name)
                VALUES ($1)
                ON CONFLICT (name) DO NOTHING
                `,
                [name]
            )
        }

        await client.query('COMMIT')
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    }
}

const runMigration = async (client, name) => {
    const filePath = path.join(migrationsDir, name)
    const sql = await readFile(filePath, 'utf8')

    await client.query('BEGIN')

    try {
        await client.query("SET LOCAL lock_timeout = '10s'")
        await client.query("SET LOCAL statement_timeout = '5min'")
        await client.query(sql)
        await client.query(
            `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1)`,
            [name]
        )
        await client.query('COMMIT')
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    }
}

export const runPendingMigrations = async ({ closePool = false, logger = console } = {}) => {
    const client = await pool.connect()
    const useAdvisoryLock = shouldUseAdvisoryLock()
    let hasMigrationLock = false
    const result = {
        applied: [],
        baseline: [],
        pending: [],
        checkedAt: new Date().toISOString(),
    }

    try {
        await ensureMigrationsTable(client)
        if (useAdvisoryLock) {
            const lockResult = await client.query(
                'SELECT pg_try_advisory_lock(hashtext($1)::bigint) AS locked',
                [MIGRATION_LOCK_KEY]
            )
            hasMigrationLock = Boolean(lockResult.rows[0]?.locked)

            if (!hasMigrationLock) {
                throw new Error('Another migration process is already running.')
            }
        } else {
            logger.warn('Skipping session advisory migration lock for Supabase pooler connection.')
        }

        const files = await getMigrationFiles()
        let appliedMigrationNames = await getAppliedMigrationNames(client)

        if (appliedMigrationNames.size === 0) {
            const detectedBaseline = await detectBaselineMigrations(client, files)

            if (detectedBaseline.length > 0) {
                logger.log(`Detected existing baseline schema: ${detectedBaseline.join(', ')}`)
                await recordAppliedMigrations(client, detectedBaseline)
                result.baseline = detectedBaseline
                appliedMigrationNames = await getAppliedMigrationNames(client)
                logger.log(`Recorded ${detectedBaseline.length} baseline migration(s) in ${MIGRATIONS_TABLE}.`)
            }
        }

        const pendingFiles = files.filter((file) => !appliedMigrationNames.has(file))
        result.pending = pendingFiles

        if (pendingFiles.length === 0) {
            logger.log('No pending migrations.')
            return result
        }

        for (const file of pendingFiles) {
            logger.log(`Applying migration: ${file}`)
            await runMigration(client, file)
            result.applied.push(file)
            logger.log(`Applied migration: ${file}`)
        }

        logger.log(`Applied ${pendingFiles.length} migration(s).`)
        return result
    } finally {
        try {
            if (useAdvisoryLock && hasMigrationLock) {
                await client.query(
                    'SELECT pg_advisory_unlock(hashtext($1)::bigint)',
                    [MIGRATION_LOCK_KEY]
                )
            }
        } finally {
            client.release()

            if (closePool) {
                await pool.end()
            }
        }
    }
}
