import path from 'path'
import { fileURLToPath } from 'url'
import { config as loadEnv } from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const serverRoot = path.resolve(__dirname, '..')

loadEnv({ path: path.join(serverRoot, '.env'), quiet: true })

process.env.DB_POOL_MAX = process.env.DB_POOL_MAX || '1'

const { runPendingMigrations } = await import('../services/migrationService.js')

runPendingMigrations({ closePool: true }).catch((error) => {
    console.error('Migration failed.')
    console.error(error)
    process.exitCode = 1
})
