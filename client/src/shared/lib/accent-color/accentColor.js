export const ACCENT_COLOR_STORAGE_KEY = 'accentColor'

const ACCENT_COLOR_CHANGE_EVENT = 'accentcolorchange'
const DEFAULT_ACCENT_COLOR = '#00ffff'
const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i

const normalizeAccentColor = (value) => (
    typeof value === 'string' && HEX_COLOR_PATTERN.test(value) ? value.toLowerCase() : null
)

const getCurrentTurquoiseColor = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return DEFAULT_ACCENT_COLOR
    }

    const value = window.getComputedStyle(document.documentElement).getPropertyValue('--turquoise').trim()

    return normalizeAccentColor(value) || DEFAULT_ACCENT_COLOR
}

export const getStoredAccentColor = () => {
    if (typeof window === 'undefined') {
        return null
    }

    try {
        return normalizeAccentColor(window.localStorage.getItem(ACCENT_COLOR_STORAGE_KEY))
    } catch {
        return null
    }
}

export const getAccentColor = () => getStoredAccentColor() || getCurrentTurquoiseColor()

export const applyAccentColor = (color) => {
    const nextColor = normalizeAccentColor(color)

    if (nextColor && typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--turquoise', nextColor)
    }

    return nextColor
}

export const saveAccentColor = (color) => {
    const nextColor = normalizeAccentColor(color) || DEFAULT_ACCENT_COLOR
    applyAccentColor(nextColor)

    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(ACCENT_COLOR_STORAGE_KEY, nextColor)
        } catch {
            // Accent color still applies in the current tab when localStorage is unavailable.
        }

        window.dispatchEvent(new CustomEvent(ACCENT_COLOR_CHANGE_EVENT, {
            detail: { color: nextColor },
        }))
    }

    return nextColor
}

export const initAccentColor = () => {
    const storedColor = getStoredAccentColor()

    if (storedColor) {
        return saveAccentColor(storedColor)
    }

    return getCurrentTurquoiseColor()
}

export const ACCENT_COLOR_EVENTS = {
    CHANGE: ACCENT_COLOR_CHANGE_EVENT,
}
