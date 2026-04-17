import { badRequest } from "../helpers/error.helper.js"

export const validate = (schema) => (req, res, next) => {
    try {
        req.body = schema.parse(req.body)
        next()
    } catch (error) {
        const message = error.issues?.map((issue) => issue.message).join(", ") || "Bad request"
        next(badRequest(message))
    }
}
