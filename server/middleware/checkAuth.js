import jwt from 'jsonwebtoken'
import { forbidden, unauthorized } from '../helpers/error.helper.js'

export const checkAuth = (req, res, next) => {
    const token = req.cookies.token

    if (!token) {
        return next(unauthorized('COMMON.UNAUTHORIZED'))
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = {
            ...decoded,
            id: decoded.userId || decoded.id,
        }
        next()
    } catch (error) {
        return next(unauthorized('COMMON.UNAUTHORIZED'))
    }
}

export const optionalAuth = (req, res, next) => {
    const token = req.cookies.token

    if (!token) {
        req.user = null
        return next()
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = {
            ...decoded,
            id: decoded.userId || decoded.id,
        }
    } catch {
        req.user = null
    }

    next()
}

export const checkNotAuth = (req, res, next) => {
    const token = req.cookies.token

    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET)
            
            return next(forbidden('AUTH.ALREADY_LOGGED_IN'))
        } catch (error) {
            return next()
        }
    }

    next()
}
