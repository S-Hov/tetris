import jwt from 'jsonwebtoken'

export const getAuthCookieOptions = (env = process.env) => {
    const isProduction = env.NODE_ENV === 'production'
    const sameSite = (env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax')).toLowerCase()
    const secure = env.COOKIE_SECURE
        ? env.COOKIE_SECURE === 'true'
        : isProduction || sameSite === 'none'
    const domain = env.COOKIE_DOMAIN || undefined

    return {
        httpOnly: true,
        secure,
        sameSite,
        path: '/',
        ...(domain ? { domain } : {}),
    }
}

export const getTokenLifetimeDays = (env = process.env) => {
    const lifetime = Number.parseInt(env.TOKEN_LIFETIME || '7', 10)

    return Number.isInteger(lifetime) && lifetime > 0 ? lifetime : 7
}

export const createAuthToken = (user, env = process.env) => jwt.sign(
    {
        userId: user.id,
        roleId: user.role_id,
    },
    env.JWT_SECRET,
    { expiresIn: `${getTokenLifetimeDays(env)}d` },
)

export const setAuthCookie = (res, user, env = process.env) => {
    const lifetimeDays = getTokenLifetimeDays(env)

    res.cookie('token', createAuthToken(user, env), {
        ...getAuthCookieOptions(env),
        maxAge: 1000 * 60 * 60 * 24 * lifetimeDays,
    })
}
