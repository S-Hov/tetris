export const THEME_STORAGE_KEY = 'theme'
export const THEMES = {
    DARK: 'dark',
    LIGHT: 'light',
}

const isTheme = (value) => Object.values(THEMES).includes(value)

export const getSystemTheme = () => {
    if (typeof window === 'undefined' || !window.matchMedia) {
        return THEMES.DARK
    }

    return window.matchMedia('(prefers-color-scheme: light)').matches ? THEMES.LIGHT : THEMES.DARK
}

export const getStoredTheme = () => {
    if (typeof window === 'undefined') {
        return null
    }

    try {
        const theme = window.localStorage.getItem(THEME_STORAGE_KEY)
        return isTheme(theme) ? theme : null
    } catch {
        return null
    }
}

export const applyTheme = (theme) => {
    if (typeof document === 'undefined') {
        return theme
    }

    const nextTheme = isTheme(theme) ? theme : THEMES.DARK
    document.documentElement.dataset.theme = nextTheme
    document.documentElement.style.colorScheme = nextTheme

    return nextTheme
}

export const saveTheme = (theme) => {
    const nextTheme = applyTheme(theme)

    if (typeof window === 'undefined') {
        return nextTheme
    }

    try {
        window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
    } catch {
        // Theme is still applied even when localStorage is unavailable.
    }

    window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: nextTheme } }))

    return nextTheme
}

export const initTheme = () => saveTheme(getStoredTheme() || getSystemTheme())

