import { verifyTurnstile, turnstileErrorResponse } from '../utils/turnstile.js'

export const requireTurnstile = async (req, res, next) => {
    const isValid = await verifyTurnstile(req.body?.turnstileToken, req.ip)

    if (!isValid) {
        return turnstileErrorResponse(res)
    }

    next()
}
