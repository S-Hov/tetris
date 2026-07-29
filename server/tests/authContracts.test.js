import assert from 'node:assert/strict'
import test from 'node:test'
import jwt from 'jsonwebtoken'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { checkAuth, checkNotAuth, optionalAuth } from '../src/modules/identity/index.js'
import {
    loginSchema,
    registerSchema,
    updatePasswordSchema,
    verifyEmailSchema,
} from '../src/modules/identity/presentation/http/identity.schemas.js'
import { collectArchitectureInventory } from '../scripts/lib/architectureInventory.js'

const __filename = fileURLToPath(import.meta.url)
const serverRoot = path.resolve(path.dirname(__filename), '..')

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

test('identity migration preserves every authentication and account-settings URL', async () => {
    const inventory = await collectArchitectureInventory(serverRoot)
    const routes = new Set(inventory.rest.map(({ method, path: routePath }) => `${method} ${routePath}`))

    for (const contract of [
        'POST /api/identity/register',
        'POST /api/identity/login',
        'POST /api/identity/password/login',
        'GET /api/identity/me',
        'PATCH /api/identity/me/password',
        'POST /api/identity/password/set',
        'POST /api/identity/logout',
        'GET /api/identity/oauth/:provider',
        'GET /api/authentication/:provider/callback',
        'POST /api/identity/verify-email/:email',
        'POST /api/identity/change-unverified-email',
        'POST /api/identity/resend-verification-email',
        'GET /api/identity/verification-time/:email',
        'POST /api/identity/password-reset',
        'GET /api/identity/password-reset/verification-time/:email',
        'POST /api/identity/password-reset/verify/:email',
        'GET /api/identity/connections',
        'POST /api/identity/connections/:provider/link',
        'DELETE /api/identity/connections/:provider/unlink',
        'PATCH /api/identity/account/email',
        'GET /api/identity/account/login-history',
    ]) {
        assert.ok(routes.has(contract), `Missing identity contract: ${contract}`)
    }
})
