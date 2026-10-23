import assert from 'node:assert/strict'
import test from 'node:test'
import jwt from 'jsonwebtoken'
import { createAuthMiddleware } from '../src/modules/identity/presentation/http/authMiddleware.js'
import { createSocketAuthMiddleware } from '../sockets/socketAuth.js'

const secret = 'desktop-session-test-secret'
const token = jwt.sign({ userId: 42 }, secret)
const invoke = (middleware, req) => new Promise(resolve => middleware(req, {}, error => resolve({ error, req })))

test('HTTP desktop bearer is verified, takes precedence over cookies and cannot fall back to a cookie', async () => {
    const { checkAuth, optionalAuth } = createAuthMiddleware({ getSecret: () => secret })
    const result = await invoke(checkAuth, { headers: { authorization: `Bearer ${token}` } })
    assert.equal(result.error, undefined)
    assert.equal(result.req.user.id, 42)
    for (const authorization of ['Bearer forged', 'Basic secret', 'Bearer']) {
        const result = await invoke(checkAuth, { headers: { authorization }, cookies: { token } })
        assert.equal(result.error.statusCode, 401)
    }
    const expired = jwt.sign({ userId: 42 }, secret, { expiresIn: -1 })
    const resultExpired = await invoke(optionalAuth, { headers: { authorization: `Bearer ${expired}` } })
    assert.equal(resultExpired.req.user, null)
})

test('socket desktop identity is resolved from a verified token, never a client userId', async () => {
    const middleware = createSocketAuthMiddleware({
        getSecret: () => secret,
        getSocketUser: async id => id === 42 ? { id, username: 'Player', role: 'user' } : null,
    })
    const connect = auth => new Promise(resolve => {
        const socket = { handshake: { auth, headers: { cookie: `token=${token}` } }, data: {} }
        middleware(socket, error => resolve({ error, socket }))
    })
    const valid = await connect({ mode: 'authenticated', token, userId: 99 })
    assert.equal(valid.error, undefined)
    assert.equal(valid.socket.data.user.id, 42)
    const invalid = await connect({ mode: 'authenticated', token: 'forged', guestId: 'guest-12345678', nickname: 'Guest' })
    assert.ok(invalid.error)
    assert.equal(invalid.socket.data.user, undefined)
    const guest = await connect({ mode: 'guest', guestId: 'guest-12345678', nickname: 'Guest' })
    assert.equal(guest.error, undefined)
    assert.equal(guest.socket.data.user.role, 'guest')
    const web = await connect({ mode: 'authenticated' })
    assert.equal(web.socket.data.user.id, 42)
})

test('desktop login returns a signed expiring session without a cookie; web login remains HttpOnly', async () => {
    const { setLoginSession } = await import('../src/modules/identity/presentation/http/sessionCookies.js')
    const env = { JWT_SECRET: secret, TOKEN_LIFETIME: '7', NODE_ENV: 'production' }
    const cookies = []
    const headers = {}
    const res = { set: (k, v) => { headers[k] = v }, cookie: (...args) => cookies.push(args) }
    const session = setLoginSession({ get: () => 'desktop' }, res, { id: 42, role_id: 2 }, env)
    const decoded = jwt.verify(session.sessionToken, secret)
    assert.equal(decoded.userId, 42)
    assert.equal(decoded.exp - decoded.iat, 7 * 86400)
    assert.equal(headers['Cache-Control'], 'no-store')
    assert.equal(cookies.length, 0)
    assert.deepEqual(setLoginSession({ get: () => undefined }, res, { id: 42 }, env), {})
    assert.equal(cookies[0][2].httpOnly, true)
    assert.equal(cookies[0][2].secure, true)
})
