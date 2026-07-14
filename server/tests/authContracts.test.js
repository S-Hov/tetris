import assert from 'node:assert/strict'
import test from 'node:test'
import jwt from 'jsonwebtoken'

import { checkAuth, checkNotAuth, optionalAuth } from '../middleware/checkAuth.js'
import {
    loginSchema,
    registerSchema,
    updatePasswordSchema,
    verifyEmailSchema,
} from '../validations/auth.validation.js'

const JWT_SECRET = 'phase-1-characterization-secret'

const withJwtSecret = async (fn) => {
    const previousSecret = process.env.JWT_SECRET
    process.env.JWT_SECRET = JWT_SECRET

    try {
        await fn()
    } finally {
        if (previousSecret === undefined) {
            delete process.env.JWT_SECRET
        } else {
            process.env.JWT_SECRET = previousSecret
        }
    }
}

const invokeMiddleware = (middleware, req) => new Promise((resolve) => {
    middleware(req, {}, (error) => resolve({ error, req }))
})

test('checkAuth accepts a signed cookie and normalizes userId to id', async () => {
    await withJwtSecret(async () => {
        const token = jwt.sign({ userId: 42, roleId: 2, username: 'Player' }, JWT_SECRET)
        const { error, req } = await invokeMiddleware(checkAuth, { cookies: { token } })

        assert.equal(error, undefined)
        assert.deepEqual(req.user, {
            userId: 42,
            roleId: 2,
            username: 'Player',
            iat: req.user.iat,
            id: 42,
        })
        assert.equal(typeof req.user.iat, 'number')
    })
})

test('checkAuth rejects missing and invalid auth cookies with the stable error code', async () => {
    await withJwtSecret(async () => {
        for (const cookies of [{}, { token: 'invalid-token' }]) {
            const { error } = await invokeMiddleware(checkAuth, { cookies })

            assert.equal(error?.statusCode, 401)
            assert.equal(error?.code, 'COMMON.UNAUTHORIZED')
        }
    })
})

test('optionalAuth keeps guests anonymous and ignores invalid cookies', async () => {
    await withJwtSecret(async () => {
        for (const cookies of [{}, { token: 'invalid-token' }]) {
            const { error, req } = await invokeMiddleware(optionalAuth, { cookies })

            assert.equal(error, undefined)
            assert.equal(req.user, null)
        }
    })
})

test('checkNotAuth blocks a valid session but permits an invalid cookie', async () => {
    await withJwtSecret(async () => {
        const token = jwt.sign({ userId: 7 }, JWT_SECRET)
        const authenticated = await invokeMiddleware(checkNotAuth, { cookies: { token } })
        const invalid = await invokeMiddleware(checkNotAuth, { cookies: { token: 'expired-or-invalid' } })

        assert.equal(authenticated.error?.statusCode, 403)
        assert.equal(authenticated.error?.code, 'AUTH.ALREADY_LOGGED_IN')
        assert.equal(invalid.error, undefined)
    })
})

test('auth schemas preserve registration, login, password and verification rules', () => {
    assert.equal(registerSchema.safeParse({
        username: 'Player_1',
        email: 'player@example.com',
        password: 'Password1',
        confirmPassword: 'Password1',
    }).success, true)

    assert.equal(registerSchema.safeParse({
        username: 'bad name',
        email: 'invalid',
        password: 'weak',
        confirmPassword: 'different',
    }).success, false)

    assert.equal(loginSchema.safeParse({ email: 'player@example.com', password: 'x' }).success, true)
    assert.equal(updatePasswordSchema.safeParse({
        currentPassword: 'OldPassword1',
        newPassword: 'NewPassword2',
        confirmPassword: 'NewPassword2',
    }).success, true)
    assert.equal(verifyEmailSchema.safeParse({ code: ' 123456 ' }).success, true)
    assert.equal(verifyEmailSchema.safeParse({ code: '12ab' }).success, false)
})
