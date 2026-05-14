import jwt from 'jsonwebtoken'

export const getAuthCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === 'production'
    const sameSite = (process.env.COOKIE_SAME_SITE || (isProduction ? 'none' : 'lax')).toLowerCase()
    const secure = process.env.COOKIE_SECURE
        ? process.env.COOKIE_SECURE === 'true'
        : isProduction || sameSite === 'none'
    const domain = process.env.COOKIE_DOMAIN || undefined

    return {
        httpOnly: true,
        secure,
        sameSite,
        path: '/',
        ...(domain ? { domain } : {}),
    }
}

export const getTokenLifetimeDays = () => {
    const lifetime = Number.parseInt(process.env.TOKEN_LIFETIME || '7', 10)

    return Number.isInteger(lifetime) && lifetime > 0 ? lifetime : 7
}

export const createAuthToken = (user) => {
    return jwt.sign(
        {
            userId: user.id,
            roleId: user.role_id,
        },
        process.env.JWT_SECRET,
        { expiresIn: `${getTokenLifetimeDays()}d` }
    )
}

export const setAuthCookie = (res, user) => {
    const token = createAuthToken(user)
    const lifetimeDays = getTokenLifetimeDays()

    res.cookie('token', token, {
        ...getAuthCookieOptions(),
        maxAge: 1000 * 60 * 60 * 24 * lifetimeDays,
    })
}
