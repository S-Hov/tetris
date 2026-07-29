import { verifyTurnstile } from '../utils/turnstile.js'
import { fail } from '../src/shared/responses/send.js'

export const requireTurnstile = async (req, res, next) => {
    const valid = await verifyTurnstile(req.body?.turnstileToken, req.ip)

    if (!valid) {
        return fail(res, req, 'AUTH.TURNSTILE_FAILED', { status: 403 })
    }

    next()
}
