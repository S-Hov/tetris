import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { createServerRuntime } from '../src/app/bootstrap.js'
import {
    DEFAULT_ALLOWED_ORIGINS,
    createContainer,
    resolveAllowedOrigins,
    resolvePort,
} from '../src/app/createContainer.js'
import { installProcessSignalHandlers } from '../src/app/lifecycle.js'

const __filename = fileURLToPath(import.meta.url)
const serverRoot = path.resolve(path.dirname(__filename), '..')

const createMemoryLogger = () => {
    const entries = []

    return {
        entries,
        log: (...args) => entries.push({ level: 'log', args }),
        warn: (...args) => entries.push({ level: 'warn', args }),
        error: (...args) => entries.push({ level: 'error', args }),
    }
}

test('composition root normalizes environment configuration without mutating env', () => {
    assert.deepEqual(resolveAllowedOrigins(' https://one.example,https://two.example '), [
        'https://one.example',
        'https://two.example',
    ])
    assert.deepEqual(resolveAllowedOrigins(''), [...DEFAULT_ALLOWED_ORIGINS])
    assert.equal(resolvePort('9000'), 9000)
    assert.equal(resolvePort(''), 8880)
    assert.equal(resolvePort('invalid'), 8880)
    assert.equal(resolvePort('0'), 0)
})

test('new runtime serves the legacy guest auth contract and shuts down cleanly', async (t) => {
    const logger = createMemoryLogger()
    const calls = {
        closeDatabase: 0,
        startupTasks: 0,
        syncedPath: null,
    }
    const container = createContainer({
        env: {
            APP_NAME: 'Bootstrap Contract Test',
            PORT: '0',
            CORS_ORIGINS: 'http://contract.test',
        },
        logger,
        syncUploads: async (uploadsPath) => {
            calls.syncedPath = uploadsPath
            return { synced: 0, total: 0 }
        },
        closeDatabase: async () => {
            calls.closeDatabase += 1
        },
        startupTasks: [{
            name: 'bootstrap contract warmup',
            run: async () => {
                calls.startupTasks += 1
            },
        }],
    })
    const runtime = createServerRuntime({ container })

    t.after(async () => {
        if (runtime.getState() !== 'stopped') {
            await runtime.stop({ reason: 'test_cleanup' })
        }
    })

    assert.equal(runtime.getState(), 'created')
    const address = await runtime.start()
    assert.equal(runtime.getState(), 'running')
    assert.equal((await runtime.start()).port, address.port)

    const response = await fetch(`http://127.0.0.1:${address.port}/api/authentication/me`, {
        headers: {
            Origin: 'http://contract.test',
            'x-language': 'en',
        },
    })
    const payload = await response.json()

    assert.equal(response.status, 200)
    assert.equal(response.headers.get('access-control-allow-origin'), 'http://contract.test')
    assert.match(response.headers.get('x-request-id'), /^[0-9a-f-]{36}$/)
    assert.deepEqual(payload, {
        success: true,
        code: 'AUTH.GUEST_SESSION',
        message: 'Guest session',
        data: {
            user: null,
            isAuthenticated: false,
        },
    })

    await runtime.stop({ reason: 'test_complete' })
    await runtime.stop({ reason: 'duplicate_stop' })

    assert.equal(runtime.getState(), 'stopped')
    assert.equal(calls.closeDatabase, 1)
    assert.equal(calls.startupTasks, 1)
    assert.equal(calls.syncedPath, container.config.uploadsPath)
    assert.ok(logger.entries.some(({ args }) => args[0] === 'App: Bootstrap Contract Test'))
})

test('signal handlers request one graceful shutdown and can be disposed', async () => {
    const processRef = new EventEmitter()
    processRef.exitCode = null
    const reasons = []
    const runtime = {
        stop: async ({ reason }) => {
            reasons.push(reason)
        },
    }
    const dispose = installProcessSignalHandlers(runtime, {
        processRef,
        logger: createMemoryLogger(),
    })

    processRef.emit('SIGTERM')
    await new Promise((resolve) => setImmediate(resolve))

    assert.deepEqual(reasons, ['SIGTERM'])
    assert.equal(processRef.exitCode, 0)

    dispose()
    assert.equal(processRef.listenerCount('SIGINT'), 0)
    assert.equal(processRef.listenerCount('SIGTERM'), 0)
})

test('server.js remains a compatibility entrypoint for src/main.js', async () => {
    const source = await readFile(path.join(serverRoot, 'server.js'), 'utf8')

    assert.match(source, /import ['"]\.\/src\/main\.js['"]/)
})
