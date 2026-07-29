// Temporary phase 3 compatibility adapter. New modules receive db explicitly.
export {
    createDatabasePool,
    createPoolConfig,
    pool,
} from '../src/shared/infrastructure/database/pool.js'
