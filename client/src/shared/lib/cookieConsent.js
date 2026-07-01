export const COOKIE_CONSENT_STORAGE_KEY = 'tetris.cookie-consent'
export const COOKIE_CONSENT_ACCEPTED_EVENT = 'tetris:cookie-consent-accepted'

const COOKIE_CONSENT_VERSION = 1

export const hasCookieConsent = () => {
    if (typeof window === 'undefined') {
        return false
    }

    try {
        const rawValue = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)

        if (!rawValue) {
            return false
        }

        const value = JSON.parse(rawValue)

        return value?.accepted === true
    } catch {
        return false
    }
}

export const acceptCookieConsent = () => {
    if (typeof window === 'undefined') {
        return null
    }

    const consent = {
        accepted: true,
        version: COOKIE_CONSENT_VERSION,
        acceptedAt: new Date().toISOString(),
    }

    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent))
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_ACCEPTED_EVENT, { detail: consent }))

    return consent
}
