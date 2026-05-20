export const GLOW_EFFECT_STORAGE_KEY = 'glowEffectEnabled'

const GLOW_EFFECT_CHANGE_EVENT = 'gloweffectchange'

const normalizeGlowEffectValue = (value) => {
    if (value === 'true') {
        return true
    }

    if (value === 'false') {
        return false
    }

    return null
}

export const getDefaultGlowEffectEnabled = () => {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return true
    }

    return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

export const getStoredGlowEffectEnabled = () => {
    if (typeof window === 'undefined') {
        return null
    }

    try {
        return normalizeGlowEffectValue(window.localStorage.getItem(GLOW_EFFECT_STORAGE_KEY))
    } catch {
        return null
    }
}

export const getGlowEffectEnabled = () => {
    const storedValue = getStoredGlowEffectEnabled()

    if (storedValue !== null) {
        return storedValue
    }

    return getDefaultGlowEffectEnabled()
}

export const saveGlowEffectEnabled = (value) => {
    const nextValue = Boolean(value)

    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(GLOW_EFFECT_STORAGE_KEY, String(nextValue))
        } catch {
            // Preference still updates for the current tab even if localStorage is unavailable.
        }

        window.dispatchEvent(new CustomEvent(GLOW_EFFECT_CHANGE_EVENT, {
            detail: { enabled: nextValue },
        }))
    }

    return nextValue
}

export const initGlowEffect = () => saveGlowEffectEnabled(getGlowEffectEnabled())

export const GLOW_EFFECT_EVENTS = {
    CHANGE: GLOW_EFFECT_CHANGE_EVENT,
}
