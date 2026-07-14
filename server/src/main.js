import 'dotenv/config'

import { createServerRuntime } from './app/bootstrap.js'
import { installProcessSignalHandlers } from './app/lifecycle.js'

const runtime = createServerRuntime()

installProcessSignalHandlers(runtime)

try {
    await runtime.start()
} catch (error) {
    console.error('Server startup failed:', error)
    process.exitCode = 1
    await runtime.stop({ reason: 'startup_error' })
}
