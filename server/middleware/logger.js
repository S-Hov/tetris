import { logger as structuredLogger } from '../src/shared/infrastructure/logging/logger.js'
import { createRequestLogger } from '../src/shared/presentation/http/requestLogger.js'

// Temporary phase 3 compatibility adapter.
export const logger = createRequestLogger({ logger: structuredLogger })
