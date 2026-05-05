import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { config as loadEnv } from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')
const migrationsDir = path.join(serverRoot, 'migrations')

loadEnv({ path: path.join(serverRoot, '.env'), quiet: true })

const { pool } = await import('../db/index.js')

const MIGRATIONS_TABLE = 'schema_migrations'
const MIGRATION_LOCK_KEY = 'pvp_tetris_schema_migrations'

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

const migrate = async () => {
    const client = await pool.connect()
    let hasMigrationLock = false

    try {
        await ensureMigrationsTable(client)
        await client.query(
            'SELECT pg_advisory_lock(hashtext($1)::bigint)',
            [MIGRATION_LOCK_KEY]
        )
        hasMigrationLock = true

        const files = await getMigrationFiles()
        const appliedMigrationNames = await getAppliedMigrationNames(client)
        const pendingFiles = files.filter((file) => !appliedMigrationNames.has(file))

        if (pendingFiles.length === 0) {
            console.log('No pending migrations.')
            return
        }

        for (const file of pendingFiles) {
            console.log(`Applying migration: ${file}`)
            await runMigration(client, file)
            console.log(`Applied migration: ${file}`)
        }

        console.log(`Applied ${pendingFiles.length} migration(s).`)
    } finally {
        try {
            if (hasMigrationLock) {
                await client.query(
                    'SELECT pg_advisory_unlock(hashtext($1)::bigint)',
                    [MIGRATION_LOCK_KEY]
                )
            }
        } finally {
            client.release()
            await pool.end()
        }
    }
}

migrate().catch((error) => {
    console.error('Migration failed.')
    console.error(error)
    process.exitCode = 1
})
