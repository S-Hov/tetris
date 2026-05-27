import { badRequest } from "../helpers/error.helper.js"

export const validate = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body)
        next()
    } catch (error) {
        const errors = error.issues?.map((issue) => ({
            path: issue.path,
            message: issue.message,
        }))

        next(badRequest('COMMON.BAD_REQUEST', { errors }))
    }
}
