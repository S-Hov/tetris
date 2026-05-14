import crypto from 'crypto'

const STATE_TTL_MS = 10 * 60 * 1000

const getStateSecret = () => {
    if (!process.env.JWT_SECRET) {
        throw new Error('JWT_SECRET is required for OAuth state protection')
    }

    return process.env.JWT_SECRET
}

const base64UrlEncode = (value) => {
    return Buffer
        .from(value)
        .toString('base64url')
}

const base64UrlDecode = (value) => {
    return Buffer
        .from(value, 'base64url')
        .toString('utf8')
}

const sign = (payload) => {
    return crypto
        .createHmac('sha256', getStateSecret())
        .update(payload)
        .digest('base64url')
}

export const getOAuthStateCookieName = (provider) => `oauth_state_${provider}`

export const createOAuthState = ({ provider, mode = 'login', userId = null, returnTo = null }) => {
    const payload = base64UrlEncode(JSON.stringify({
        provider,
        mode,
        userId,
        returnTo,
        nonce: crypto.randomBytes(16).toString('hex'),
        expiresAt: Date.now() + STATE_TTL_MS,
    }))

    return `${payload}.${sign(payload)}`
}

export const verifyOAuthState = ({ provider, state, cookieState }) => {
    if (!state || !cookieState || state !== cookieState) {
        throw new Error('Invalid OAuth state')
    }

    const [payload, signature] = state.split('.')

    if (!payload || !signature) {
        throw new Error('Invalid OAuth state')
    }

    const expectedSignature = sign(payload)
    const signatureBuffer = Buffer.from(signature)
    const expectedSignatureBuffer = Buffer.from(expectedSignature)

    if (
        signatureBuffer.length !== expectedSignatureBuffer.length ||
        !crypto.timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
        throw new Error('Invalid OAuth state')
    }

    const parsed = JSON.parse(base64UrlDecode(payload))

    if (parsed.provider !== provider || Number(parsed.expiresAt) < Date.now()) {
        throw new Error('Invalid OAuth state')
    }

    return parsed
}

export const getOAuthStateCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === 'production'
    const secure = process.env.COOKIE_SECURE
        ? process.env.COOKIE_SECURE === 'true'
        : isProduction
    const domain = process.env.COOKIE_DOMAIN || undefined

    return {
        httpOnly: true,
        secure,
        sameSite: 'lax',
        path: '/',
        maxAge: STATE_TTL_MS,
        ...(domain ? { domain } : {}),
    }
}
