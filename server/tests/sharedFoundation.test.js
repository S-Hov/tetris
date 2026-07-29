import assert from 'node:assert/strict'
import test from 'node:test'

import {
    EnvironmentValidationError,
    createConfig,
} from '../src/config/env.js'
import {
    ApplicationError,
    ConflictError,
} from '../src/shared/application/errors/ApplicationError.js'
import { withTransaction } from '../src/shared/infrastructure/database/transaction.js'
import { createLogger } from '../src/shared/infrastructure/logging/logger.js'
import { mapHttpError } from '../src/shared/presentation/http/mapHttpError.js'
import {
    getRequestContext,
    runWithRequestContext,
} from '../src/shared/presentation/http/requestContext.js'

test('environment configuration is validated, normalized and immutable', () => {
    const config = createConfig({
        APP_NAME: 'Foundation Test',
        PORT: '0',
        NODE_ENV: 'test',
        DATABASE_MODE: 'local',
        LOCAL_DB_PORT: '5432',
        CORS_ORIGINS: 'https://one.example/, https://one.example, https://two.example',
    })

    assert.equal(config.port, 0)
    assert.equal(config.database.mode, 'local')
    assert.equal(config.database.localPort, 5432)
    assert.deepEqual(config.allowedOrigins, [
        'https://one.example',
        'https://two.example',
    ])
    assert.ok(Object.isFrozen(config))
    assert.ok(Object.isFrozen(config.database))

    assert.throws(
        () => createConfig({ PORT: 'not-a-port' }),
        EnvironmentValidationError,
    )
})

test('typed application errors have stable codes and one HTTP mapping', () => {
    const conflict = new ConflictError('COSMETICS.ITEM_ALREADY_OWNED', {
        data: { itemKey: 'depth-core' },
    })

    assert.deepEqual(mapHttpError(conflict), {
        status: 409,
        code: 'COSMETICS.ITEM_ALREADY_OWNED',
        data: { itemKey: 'depth-core' },
        message: undefined,
        unexpected: false,
    })

    const unexpected = mapHttpError(new Error('database password leaked'))
    assert.equal(unexpected.status, 500)
    assert.equal(unexpected.code, 'COMMON.INTERNAL_ERROR')
    assert.equal(unexpected.message, undefined)
    assert.equal(unexpected.unexpected, true)

    const legacy = new ApplicationError('Old validation text', { statusCode: 400 })
    assert.equal(mapHttpError(legacy).message, 'Old validation text')
})

test('withTransaction commits a successful operation and always releases the client', async () => {
    const calls = []
    const client = {
        query: async (sql) => calls.push(sql),
        release: () => calls.push('RELEASE'),
    }
    const pool = { connect: async () => client }

    const result = await withTransaction(pool, async (tx) => {
        assert.equal(tx, client)
        calls.push('OPERATION')
        return { saved: true }
    })

    assert.deepEqual(result, { saved: true })
    assert.deepEqual(calls, ['BEGIN', 'OPERATION', 'COMMIT', 'RELEASE'])
})

test('withTransaction rolls back failures and preserves the original error', async () => {
    const calls = []
    const client = {
        query: async (sql) => calls.push(sql),
        release: () => calls.push('RELEASE'),
    }
    const pool = { connect: async () => client }
    const failure = new Error('operation failed')

    await assert.rejects(
        withTransaction(pool, async () => {
            calls.push('OPERATION')
            throw failure
        }),
        (error) => error === failure,
    )
    assert.deepEqual(calls, ['BEGIN', 'OPERATION', 'ROLLBACK', 'RELEASE'])
})

test('structured logger carries request context and redacts secrets', () => {
    const lines = []
    const sink = {
        log: (line) => lines.push(line),
        warn: (line) => lines.push(line),
        error: (line) => lines.push(line),
    }
    const logger = createLogger({
        sink,
        service: 'foundation-test',
        clock: () => new Date('2026-07-29T12:00:00.000Z'),
    })

    runWithRequestContext({ requestId: 'request-42', userId: 7 }, () => {
        assert.equal(getRequestContext().requestId, 'request-42')
        logger.info('test_event', {
            authorization: 'Bearer secret',
            diagnostic: 'postgresql://user:password@example.test/database',
            nested: {
                password: 'secret',
                safe: 'visible',
            },
        })
    })

    const entry = JSON.parse(lines[0])
    assert.equal(entry.requestId, 'request-42')
    assert.equal(entry.userId, 7)
    assert.equal(entry.authorization, '[REDACTED]')
    assert.equal(entry.diagnostic, 'postgresql://user:[REDACTED]@example.test/database')
    assert.equal(entry.nested.password, '[REDACTED]')
    assert.equal(entry.nested.safe, 'visible')
})
