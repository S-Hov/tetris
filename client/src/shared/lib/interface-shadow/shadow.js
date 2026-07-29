export const INTERFACE_SHADOW_STORAGE_KEY = 'interfaceShadowIntensity'

const INTERFACE_SHADOW_CHANGE_EVENT = 'interfaceshadowchange'

export const INTERFACE_SHADOW_MIN = 0
export const INTERFACE_SHADOW_MAX = 100
export const INTERFACE_SHADOW_STEP = 5
export const DEFAULT_INTERFACE_SHADOW_INTENSITY = 100

const SHADOW_VARIABLES = [
    '--shadow',
    '--revers-shadow',
    '--hover-shadow',
    '--lite-shadow',
    '--hard-shadow',
    '--text-shadow',
    '--cta-shadow',
]

let areInterfaceShadowListenersInitialized = false

const normalizeIntensity = (value) => {
    const numberValue = Number(value)

    if (!Number.isFinite(numberValue)) {
        return DEFAULT_INTERFACE_SHADOW_INTENSITY
    }

    const clampedValue = Math.max(INTERFACE_SHADOW_MIN, Math.min(INTERFACE_SHADOW_MAX, numberValue))
    return Math.round(clampedValue / INTERFACE_SHADOW_STEP) * INTERFACE_SHADOW_STEP
}

const scaleAlpha = (alpha, factor) => Math.max(0, Math.min(1, Number(alpha) * factor))

const scaleShadowColors = (shadow, factor) => shadow
    .replace(/rgba\(\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([\d.]+)\s*\)/gi, (_, red, green, blue, alpha) => (
        `rgba(${red}, ${green}, ${blue}, ${scaleAlpha(alpha, factor)})`
    ))
    .replace(/#([\da-f]{6})([\da-f]{2})(?![\da-f])/gi, (_, color, alpha) => (
        `rgba(${parseInt(color.slice(0, 2), 16)}, ${parseInt(color.slice(2, 4), 16)}, ${parseInt(color.slice(4, 6), 16)}, ${scaleAlpha(parseInt(alpha, 16) / 255, factor)})`
    ))

export const getStoredInterfaceShadowIntensity = () => {
    if (typeof window === 'undefined') {
        return null
    }

    try {
        const rawValue = window.localStorage.getItem(INTERFACE_SHADOW_STORAGE_KEY)
        return rawValue === null ? null : normalizeIntensity(rawValue)
    } catch {
        return null
    }
}

export const getInterfaceShadowIntensity = () => (
    getStoredInterfaceShadowIntensity() ?? DEFAULT_INTERFACE_SHADOW_INTENSITY
)

export const applyInterfaceShadowIntensity = (intensity) => {
    const nextIntensity = normalizeIntensity(intensity)

    if (typeof document === 'undefined') {
        return nextIntensity
    }

    const root = document.documentElement

    SHADOW_VARIABLES.forEach((variable) => root.style.removeProperty(variable))

    if (nextIntensity === DEFAULT_INTERFACE_SHADOW_INTENSITY) {
        root.dataset.interfaceShadow = 'full'
        return nextIntensity
    }

    if (nextIntensity === 0) {
        SHADOW_VARIABLES.forEach((variable) => root.style.setProperty(variable, 'none'))
        root.dataset.interfaceShadow = 'off'
        return nextIntensity
    }

    const computedStyles = window.getComputedStyle(root)
    const factor = nextIntensity / DEFAULT_INTERFACE_SHADOW_INTENSITY

    SHADOW_VARIABLES.forEach((variable) => {
        const shadow = computedStyles.getPropertyValue(variable).trim()

        if (shadow) {
            root.style.setProperty(variable, scaleShadowColors(shadow, factor))
        }
    })

    root.dataset.interfaceShadow = 'custom'
    return nextIntensity
}

export const saveInterfaceShadowIntensity = (intensity) => {
    const nextIntensity = applyInterfaceShadowIntensity(intensity)

    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(INTERFACE_SHADOW_STORAGE_KEY, String(nextIntensity))
        } catch {
            // Shadow preferences still apply in the current tab when localStorage is unavailable.
        }

        window.dispatchEvent(new CustomEvent(INTERFACE_SHADOW_CHANGE_EVENT, {
            detail: { intensity: nextIntensity },
        }))
    }

    return nextIntensity
}

export const initInterfaceShadowIntensity = () => {
    const intensity = getInterfaceShadowIntensity()

    if (!areInterfaceShadowListenersInitialized) {
        const themeStylesheet = document.getElementById('app-theme-stylesheet')

        themeStylesheet?.addEventListener('load', () => applyInterfaceShadowIntensity(getInterfaceShadowIntensity()))
        window.addEventListener('themechange', () => {
            window.requestAnimationFrame(() => applyInterfaceShadowIntensity(getInterfaceShadowIntensity()))
        })
        areInterfaceShadowListenersInitialized = true
    }

    return saveInterfaceShadowIntensity(intensity)
}

export const INTERFACE_SHADOW_EVENTS = {
    CHANGE: INTERFACE_SHADOW_CHANGE_EVENT,
}
