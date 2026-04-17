import jwt from 'jsonwebtoken'
import { forbidden, unauthorized } from '../helpers/error.helper.js'

export const checkAuth = (req, res, next) => {
    const token = req.cookies.token

    if (!token) {
        return next(unauthorized("No token"))
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        req.user = decoded
        next()
    } catch (error) {
        return next(unauthorized("Invalid or expired token"))
    }
}

export const checkNotAuth = (req, res, next) => {
    const token = req.cookies.token

    if (token) {
        try {
            jwt.verify(token, process.env.JWT_SECRET)
            
            return next(forbidden("You are already logged in"))
        } catch (error) {
            return next()
        }
    }

    next()
}
