import { forbidden } from "../helpers/error.helper"

export const checkRole = (roles = []) => {
    return (req, res, next) => {
        const user = req.user

        if (!user || !roles.includes(user.role)) {
            return next(forbidden("Access denied"))
        }

        next()
    }
}