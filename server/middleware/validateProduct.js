import { badRequest } from "../helpers/error.helper.js"

export const validateProductData = (req, res, next) => {
    const { name, price } = req.body

    if (typeof name !== 'string' || name.trim() === '') {
        return next(badRequest("Invalid name"))
    }

    const parsedPrice = Number(price)

    if (isNaN(parsedPrice) || parsedPrice <= 0) {
        return next(badRequest("Invalid price"))
    }

    req.body.name = name.trim()
    req.body.price = parsedPrice

    next()
}

export const validateProductId = (req, res, next) => {
    const id = Number(req.params.id)

    if (isNaN(id) || id <= 0) {
        return next(badRequest("Invalid id"))
    }

    req.params.id = id
    next()
}