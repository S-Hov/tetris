import assert from 'node:assert/strict'
import test from 'node:test'
import jwt from 'jsonwebtoken'

import {
    REQUIRED_CAPABILITIES,
    createAuthMiddleware,
    createAuthToken,
    createIdentityApplication,
    createOAuthProviderConfig,
    createOAuthState,
    getAuthCookieOptions,
    isStrongPassword,
    normalizeIdentityEmail,
    verifyOAuthState,
} from '../src/modules/identity/index.js'

test('identity exposes one explicit application API and delegates through injected ports', async () => {
    const calls = []
    const dependencies = Object.fromEntries(REQUIRED_CAPABILITIES.map((name) => [
        name,
        async (...args) => {
            calls.push({ name, args })
            return { capability: name }
        },
    ]))
    const identity = createIdentityApplication(dependencies)

    assert.ok(Object.isFrozen(identity))
    assert.deepEqual(Object.keys(identity), [...REQUIRED_CAPABILITIES])
    assert.deepEqual(await identity.registerUser({ email: 'user@example.com' }), {
        capability: 'registerUser',
    })
    assert.deepEqual(calls, [{
        name: 'registerUser',
        args: [{ email: 'user@example.com' }],
    }])
})

test('identity application fails clearly when a required adapter is absent', () => {
    const identity = createIdentityApplication({})

    assert.throws(
        () => identity.verifyEmail('user@example.com', '123456'),
        /Identity capability is required: verifyEmail/,
    )
})

test('password and email policies are transport-neutral', () => {
    assert.equal(isStrongPassword('Password1'), true)
    assert.equal(isStrongPassword('password'), false)
    assert.equal(isStrongPassword('PASSWORD1'), false)
    assert.equal(normalizeIdentityEmail(' User@Example.COM '), 'user@example.com')
})

test('session cookie policy preserves secure production defaults', () => {
    assert.deepEqual(getAuthCookieOptions({ NODE_ENV: 'development' }), {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
    })
    assert.deepEqual(getAuthCookieOptions({ NODE_ENV: 'production' }), {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        path: '/',
    })

    const token = createAuthToken({ id: 9, role_id: 2 }, {
        JWT_SECRET: 'identity-session-test-secret',
        TOKEN_LIFETIME: '3',
    })
    assert.equal(jwt.verify(token, 'identity-session-test-secret').userId, 9)
})

test('OAuth state is signed, scoped to provider and expires', () => {
    const env = { JWT_SECRET: 'identity-oauth-state-secret' }
    const state = createOAuthState({
        provider: 'github',
        mode: 'link',
        userId: 42,
        returnTo: '/profile',
    }, {
        env,
        now: () => 1_000,
        nonce: () => 'fixed-nonce',
    })
    const parsed = verifyOAuthState({
        provider: 'github',
        state,
        cookieState: state,
    }, {
        env,
        now: () => 2_000,
    })

    assert.equal(parsed.mode, 'link')
    assert.equal(parsed.userId, 42)
    assert.throws(() => verifyOAuthState({
        provider: 'google',
        state,
        cookieState: state,
    }, { env, now: () => 2_000 }), /Invalid OAuth state/)
    assert.throws(() => verifyOAuthState({
        provider: 'github',
        state,
        cookieState: state,
    }, { env, now: () => 1_000_000 }), /Invalid OAuth state/)
})

test('OAuth redirect policy rejects untrusted origins', () => {
    const providers = createOAuthProviderConfig({
        CLIENT_URL: 'https://client.example',
        SERVER_URL: 'https://api.example',
        OAUTH_REDIRECT_WHITELIST: 'https://admin.example',
        GITHUB_CLIENT_ID: 'id',
        GITHUB_CLIENT_SECRET: 'secret',
    })

    assert.equal(providers.isOAuthProviderEnabled('github'), true)
    assert.equal(
        providers.resolveClientRedirectUrl('https://admin.example/settings'),
        'https://admin.example/settings',
    )
    assert.equal(
        providers.resolveClientRedirectUrl('https://evil.example/phishing', '/login'),
        'https://client.example/login',
    )
})

test('auth middleware can be isolated with an injected session secret', async () => {
    const secret = 'identity-middleware-secret'
    const { checkAuth } = createAuthMiddleware({ getSecret: () => secret })
    const token = jwt.sign({ userId: 77, roleId: 2 }, secret)
    const req = { cookies: { token } }
    const error = await new Promise((resolve) => checkAuth(req, {}, resolve))

    assert.equal(error, undefined)
    assert.equal(req.user.id, 77)
})
