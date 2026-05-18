const LOGIN_TURNSTILE_THRESHOLD = Number(process.env.LOGIN_TURNSTILE_THRESHOLD || 3)
const LOGIN_ATTEMPT_TTL_MS = Number(process.env.LOGIN_TURNSTILE_TTL_MS || 15 * 60 * 1000)

const loginAttempts = new Map()

const getAttemptKey = (email, ip) => `${String(email || '').trim().toLowerCase()}|${ip || ''}`

const getAttemptRecord = (key) => {
    const record = loginAttempts.get(key)

    if (!record) {
        return { count: 0, expiresAt: 0 }
    }

    if (record.expiresAt <= Date.now()) {
        loginAttempts.delete(key)
        return { count: 0, expiresAt: 0 }
    }

    return record
}

export const requiresLoginTurnstile = (email, ip) => {
    if (LOGIN_TURNSTILE_THRESHOLD <= 0) {
        return true
    }

    const key = getAttemptKey(email, ip)
    return getAttemptRecord(key).count >= LOGIN_TURNSTILE_THRESHOLD
}

export const recordLoginFailure = (email, ip) => {
    const key = getAttemptKey(email, ip)
    const record = getAttemptRecord(key)
    const nextRecord = {
        count: record.count + 1,
        expiresAt: Date.now() + LOGIN_ATTEMPT_TTL_MS,
    }

    loginAttempts.set(key, nextRecord)

    return nextRecord.count >= LOGIN_TURNSTILE_THRESHOLD
}

export const clearLoginFailures = (email, ip) => {
    loginAttempts.delete(getAttemptKey(email, ip))
}
