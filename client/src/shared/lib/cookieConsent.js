export const COOKIE_CONSENT_STORAGE_KEY = 'tetris.cookie-consent'
export const COOKIE_CONSENT_ACCEPTED_EVENT = 'tetris:cookie-consent-accepted'
export const COOKIE_CONSENT_CHANGED_EVENT = 'tetris:cookie-consent-changed'

export const COOKIE_CONSENT_MODES = {
    ALL: 'all',
    NECESSARY: 'necessary',
}

const COOKIE_CONSENT_VERSION = 2

export const getCookieConsent = () => {
    if (typeof window === 'undefined') {
        return null
    }

    try {
        const rawValue = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)

        if (!rawValue) {
            return null
        }

        const value = JSON.parse(rawValue)

        if (value?.mode === COOKIE_CONSENT_MODES.ALL || value?.accepted === true) {
            return {
                ...value,
                mode: COOKIE_CONSENT_MODES.ALL,
                analytics: true,
            }
        }

        if (value?.mode === COOKIE_CONSENT_MODES.NECESSARY) {
            return {
                ...value,
                mode: COOKIE_CONSENT_MODES.NECESSARY,
                analytics: false,
            }
        }

        return null
    } catch {
        return null
    }
}

export const hasCookieConsent = () => Boolean(getCookieConsent())

export const hasAnalyticsCookieConsent = () => getCookieConsent()?.analytics === true

export const saveCookieConsent = (mode = COOKIE_CONSENT_MODES.NECESSARY) => {
    if (typeof window === 'undefined') {
        return null
    }

    const normalizedMode = mode === COOKIE_CONSENT_MODES.ALL
        ? COOKIE_CONSENT_MODES.ALL
        : COOKIE_CONSENT_MODES.NECESSARY
    const consent = {
        accepted: normalizedMode === COOKIE_CONSENT_MODES.ALL,
        analytics: normalizedMode === COOKIE_CONSENT_MODES.ALL,
        mode: normalizedMode,
        version: COOKIE_CONSENT_VERSION,
        acceptedAt: new Date().toISOString(),
    }

    window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(consent))
    window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_CHANGED_EVENT, { detail: consent }))

    if (consent.analytics) {
        window.dispatchEvent(new CustomEvent(COOKIE_CONSENT_ACCEPTED_EVENT, { detail: consent }))
    }

    return consent
}

export const acceptCookieConsent = () => saveCookieConsent(COOKIE_CONSENT_MODES.ALL)

export const acceptNecessaryCookieConsent = () => saveCookieConsent(COOKIE_CONSENT_MODES.NECESSARY)
