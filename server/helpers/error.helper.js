import { ApiError } from "../utils/ApiError.js"

export const notFound = (msg = "Resource not found") => new ApiError(msg, 404)

export const badRequest = (msg = "Bad request") => new ApiError(msg, 400)

export const unauthorized = (msg = "Unauthorized") => new ApiError(msg, 401)

export const forbidden = (msg = "Forbidden") => new ApiError(msg, 403)

export const internal = (msg = "Internal Server Error") => new ApiError(msg, 500)