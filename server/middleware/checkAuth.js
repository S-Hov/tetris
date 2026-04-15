import jwt from 'jsonwebtoken'
import { unauthorized } from '../helpers/error.helper.js'

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