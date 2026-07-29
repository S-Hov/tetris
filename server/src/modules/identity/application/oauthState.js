import crypto from 'node:crypto'

export const OAUTH_STATE_TTL_MS = 10 * 60 * 1000

const getStateSecret = (env) => {
    if (!env.JWT_SECRET) {
        throw new Error('JWT_SECRET is required for OAuth state protection')
    }

    return env.JWT_SECRET
}

const encode = (value) => Buffer.from(value).toString('base64url')
const decode = (value) => Buffer.from(value, 'base64url').toString('utf8')

const sign = (payload, env) => crypto
    .createHmac('sha256', getStateSecret(env))
    .update(payload)
    .digest('base64url')

export const getOAuthStateCookieName = (provider) => `oauth_state_${provider}`

export const createOAuthState = ({
    provider,
    mode = 'login',
    userId = null,
    returnTo = null,
}, {
    env = process.env,
    now = () => Date.now(),
    nonce = () => crypto.randomBytes(16).toString('hex'),
} = {}) => {
    const payload = encode(JSON.stringify({
        provider,
        mode,
        userId,
        returnTo,
        nonce: nonce(),
        expiresAt: now() + OAUTH_STATE_TTL_MS,
    }))

    return `${payload}.${sign(payload, env)}`
}

export const verifyOAuthState = ({ provider, state, cookieState }, {
    env = process.env,
    now = () => Date.now(),
} = {}) => {
    if (!state || !cookieState || state !== cookieState) {
        throw new Error('Invalid OAuth state')
    }

    const [payload, signature] = state.split('.')

    if (!payload || !signature) {
        throw new Error('Invalid OAuth state')
    }

    const expected = sign(payload, env)
    const actualBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expected)

    if (
        actualBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(actualBuffer, expectedBuffer)
    ) {
        throw new Error('Invalid OAuth state')
    }

    const parsed = JSON.parse(decode(payload))

    if (parsed.provider !== provider || Number(parsed.expiresAt) < now()) {
        throw new Error('Invalid OAuth state')
    }

    return parsed
}

export const getOAuthStateCookieOptions = (env = process.env) => {
    const isProduction = env.NODE_ENV === 'production'
    const secure = env.COOKIE_SECURE
        ? env.COOKIE_SECURE === 'true'
        : isProduction
    const domain = env.COOKIE_DOMAIN || undefined

    return {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: OAUTH_STATE_TTL_MS,
        ...(domain ? { domain } : {}),
    }
}
