import jwt from 'jsonwebtoken'

import { forbidden, unauthorized } from '../../../../shared/responses/errors.js'
import { updateRequestContext } from '../../../../shared/presentation/http/requestContext.js'

const decodeIdentity = (token, secret) => {
    const decoded = jwt.verify(token, secret)

    return {
        ...decoded,
        id: decoded.userId || decoded.id,
    }
}

const getToken = (req) => req.cookies?.token

export const createAuthMiddleware = ({
    getSecret = () => process.env.JWT_SECRET,
} = {}) => {
    const checkAuth = (req, res, next) => {
        const token = getToken(req)

        if (!token) {
            return next(unauthorized('COMMON.UNAUTHORIZED'))
        }

        try {
            req.user = decodeIdentity(token, getSecret())
            updateRequestContext({ userId: req.user.id })
            next()
        } catch {
            return next(unauthorized('COMMON.UNAUTHORIZED'))
        }
    }

    const optionalAuth = (req, res, next) => {
        const token = getToken(req)

        if (!token) {
            req.user = null
            return next()
        }

        try {
            req.user = decodeIdentity(token, getSecret())
            updateRequestContext({ userId: req.user.id })
        } catch {
            req.user = null
        }

        next()
    }

    const checkNotAuth = (req, res, next) => {
        const token = getToken(req)

        if (!token) {
            return next()
        }

        try {
            decodeIdentity(token, getSecret())
            return next(forbidden('AUTH.ALREADY_LOGGED_IN'))
        } catch {
            return next()
        }
    }

    return Object.freeze({ checkAuth, optionalAuth, checkNotAuth })
}

export const identityAuthMiddleware = createAuthMiddleware()
export const { checkAuth, optionalAuth, checkNotAuth } = identityAuthMiddleware
