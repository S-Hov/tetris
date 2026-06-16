export const THEME_STORAGE_KEY = 'theme'
export const THEME_STYLESHEET_ID = 'app-theme-stylesheet'
export const THEMES = {
    DARK: 'dark',
    LIGHT: 'light',
    AURORA_DARK: 'aurora-dark',
    AURORA_LIGHT: 'aurora-light',
    EMBER_DARK: 'ember-dark',
    EMBER_LIGHT: 'ember-light',
    MATRIX_DARK: 'matrix-dark',
    MATRIX_LIGHT: 'matrix-light',
}

export const THEME_COLOR_MODES = {
    DARK: 'dark',
    LIGHT: 'light',
}

export const THEME_PALETTES = {
    CYBER: 'cyber',
    AURORA: 'aurora',
    EMBER: 'ember',
    MATRIX: 'matrix',
}

export const THEME_PALETTE_OPTIONS = [
    {
        value: THEME_PALETTES.CYBER,
        labelKey: 'accountSettings.general.themePalettes.cyber',
        colors: ['#00ffff', '#ff00ff', '#0088ff'],
    },
    {
        value: THEME_PALETTES.AURORA,
        labelKey: 'accountSettings.general.themePalettes.aurora',
        colors: ['#55f0d5', '#d85cff', '#75f2aa'],
    },
    {
        value: THEME_PALETTES.EMBER,
        labelKey: 'accountSettings.general.themePalettes.ember',
        colors: ['#ff8a3d', '#ff4f8f', '#ffc94a'],
    },
    {
        value: THEME_PALETTES.MATRIX,
        labelKey: 'accountSettings.general.themePalettes.matrix',
        colors: ['#45ff72', '#4ed9ff', '#e4ff68'],
    },
]

const THEME_STYLESHEET_BY_PALETTE = {
    [THEME_PALETTES.CYBER]: '/themes/cyber.css',
    [THEME_PALETTES.AURORA]: '/themes/aurora.css',
    [THEME_PALETTES.EMBER]: '/themes/ember.css',
    [THEME_PALETTES.MATRIX]: '/themes/matrix.css',
}

const THEME_BY_PALETTE_AND_MODE = {
    [THEME_PALETTES.CYBER]: {
        [THEME_COLOR_MODES.DARK]: THEMES.DARK,
        [THEME_COLOR_MODES.LIGHT]: THEMES.LIGHT,
    },
    [THEME_PALETTES.AURORA]: {
        [THEME_COLOR_MODES.DARK]: THEMES.AURORA_DARK,
        [THEME_COLOR_MODES.LIGHT]: THEMES.AURORA_LIGHT,
    },
    [THEME_PALETTES.EMBER]: {
        [THEME_COLOR_MODES.DARK]: THEMES.EMBER_DARK,
        [THEME_COLOR_MODES.LIGHT]: THEMES.EMBER_LIGHT,
    },
    [THEME_PALETTES.MATRIX]: {
        [THEME_COLOR_MODES.DARK]: THEMES.MATRIX_DARK,
        [THEME_COLOR_MODES.LIGHT]: THEMES.MATRIX_LIGHT,
    },
}

const THEME_META = Object.entries(THEME_BY_PALETTE_AND_MODE).reduce((meta, [palette, modes]) => {
    Object.entries(modes).forEach(([colorMode, theme]) => {
        meta[theme] = { colorMode, palette }
    })

    return meta
}, {})

const isTheme = (value) => Object.values(THEMES).includes(value)
const isColorMode = (value) => Object.values(THEME_COLOR_MODES).includes(value)
const isPalette = (value) => Object.values(THEME_PALETTES).includes(value)

export const getThemeColorMode = (theme) => THEME_META[theme]?.colorMode || THEME_COLOR_MODES.DARK
export const getThemePalette = (theme) => THEME_META[theme]?.palette || THEME_PALETTES.CYBER
export const getThemeStylesheetHref = (theme) => THEME_STYLESHEET_BY_PALETTE[getThemePalette(theme)]

export const getThemeByPaletteAndMode = ({ colorMode, palette }) => {
    const nextPalette = isPalette(palette) ? palette : THEME_PALETTES.CYBER
    const nextColorMode = isColorMode(colorMode) ? colorMode : THEME_COLOR_MODES.DARK

    return THEME_BY_PALETTE_AND_MODE[nextPalette][nextColorMode]
}

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
    const stylesheetHref = getThemeStylesheetHref(nextTheme)
    let themeStylesheet = document.getElementById(THEME_STYLESHEET_ID)

    if (!themeStylesheet) {
        themeStylesheet = document.createElement('link')
        themeStylesheet.id = THEME_STYLESHEET_ID
        themeStylesheet.rel = 'stylesheet'
        document.head.appendChild(themeStylesheet)
    }

    if (themeStylesheet.getAttribute('href') !== stylesheetHref) {
        themeStylesheet.setAttribute('href', stylesheetHref)
    }

    document.documentElement.dataset.theme = nextTheme
    document.documentElement.style.colorScheme = getThemeColorMode(nextTheme)

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
