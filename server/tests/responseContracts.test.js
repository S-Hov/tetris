import assert from 'node:assert/strict'
import test from 'node:test'

import { errorHandler } from '../middleware/errorHandler.js'
import { badRequest, forbidden } from '../src/shared/responses/errors.js'
import { fail, ok } from '../src/shared/responses/send.js'

const createResponse = () => {
    const result = { status: 200, payload: null }
    const res = {
        status(status) {
            result.status = status
            return res
        },
        json(payload) {
            result.payload = payload
            return payload
        },
    }

    return { res, result }
}

test('successful API responses preserve the unified envelope and language selection', () => {
    const { res, result } = createResponse()
    const req = { headers: { 'x-language': 'en' } }

    ok(res, req, 'MATCH.LIST_LOADED', {
        status: 201,
        data: { matches: [] },
        meta: { page: 1 },
    })

    assert.deepEqual(result, {
        status: 201,
        payload: {
            success: true,
            code: 'MATCH.LIST_LOADED',
            message: 'Match list loaded',
            data: { matches: [] },
            meta: { page: 1 },
        },
    })
})

test('failed API responses preserve code, data and validation errors', () => {
    const { res, result } = createResponse()

    fail(res, { headers: {} }, 'COMMON.BAD_REQUEST', {
        status: 422,
        data: { field: 'email' },
        errors: [{ path: ['email'], message: 'invalid' }],
    })

    assert.equal(result.status, 422)
    assert.equal(result.payload.success, false)
    assert.equal(result.payload.code, 'COMMON.BAD_REQUEST')
    assert.equal(result.payload.message, 'Некорректный запрос')
    assert.deepEqual(result.payload.data, { field: 'email' })
    assert.deepEqual(result.payload.errors, [{ path: ['email'], message: 'invalid' }])
})

test('typed and legacy application errors keep the current HTTP mapping', () => {
    const typed = createResponse()
    errorHandler(forbidden('COMMON.FORBIDDEN', { reason: 'private' }), { headers: {} }, typed.res)

    assert.equal(typed.result.status, 403)
    assert.deepEqual(typed.result.payload, {
        success: false,
        code: 'COMMON.FORBIDDEN',
        message: 'Доступ запрещён',
        data: { reason: 'private' },
    })

    const legacy = createResponse()
    errorHandler(badRequest('Legacy validation text'), { headers: {} }, legacy.res)

    assert.equal(legacy.result.status, 400)
    assert.equal(legacy.result.payload.code, 'COMMON.BAD_REQUEST')
    assert.equal(legacy.result.payload.message, 'Legacy validation text')
})
