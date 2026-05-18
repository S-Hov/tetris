const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

export async function verifyTurnstile(turnstileToken, ip) {
    const secret = process.env.TURNSTILE_SECRET_KEY

    if (!secret || !turnstileToken) {
        return false
    }

    const body = new URLSearchParams({
        secret,
        response: turnstileToken,
    })

    if (ip) {
        body.set('remoteip', ip)
    }

    try {
        const response = await fetch(TURNSTILE_VERIFY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body,
        })

        if (!response.ok) {
            return false
        }

        const data = await response.json()
        return data.success === true
    } catch (error) {
        console.error('Turnstile verify error:', error)
        return false
    }
}

export const turnstileErrorResponse = (res) => res.status(403).json({
    message: 'Проверка безопасности не пройдена',
})
