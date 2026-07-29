const DEFAULT_THRESHOLD = 3
const DEFAULT_TTL_MS = 15 * 60 * 1000
const attempts = new Map()

const keyFor = (email, ip) => `${String(email || '').trim().toLowerCase()}|${ip || ''}`

const readAttempt = (key, now) => {
    const record = attempts.get(key)

    if (!record || record.expiresAt <= now) {
        attempts.delete(key)
        return { count: 0, expiresAt: 0 }
    }

    return record
}

export const createLoginAttemptPolicy = ({
    threshold = Number(process.env.LOGIN_TURNSTILE_THRESHOLD || DEFAULT_THRESHOLD),
    ttlMs = Number(process.env.LOGIN_TURNSTILE_TTL_MS || DEFAULT_TTL_MS),
    now = () => Date.now(),
    store = attempts,
} = {}) => ({
    requiresTurnstile(email, ip) {
        return threshold <= 0 || readAttempt(keyFor(email, ip), now()).count >= threshold
    },
    recordFailure(email, ip) {
        const key = keyFor(email, ip)
        const record = readAttempt(key, now())
        const next = { count: record.count + 1, expiresAt: now() + ttlMs }
        store.set(key, next)
        return next.count >= threshold
    },
    clear(email, ip) {
        store.delete(keyFor(email, ip))
    },
})

export const loginAttemptPolicy = createLoginAttemptPolicy()
