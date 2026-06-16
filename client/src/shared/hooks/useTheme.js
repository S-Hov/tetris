import { useEffect, useState } from 'react'
import {
    getStoredTheme,
    getThemeByPaletteAndMode,
    getThemeColorMode,
    getThemePalette,
    initTheme,
    saveTheme,
    THEME_COLOR_MODES,
    THEME_STORAGE_KEY,
    THEMES,
} from '@/shared/lib/theme/theme.js'

const getCurrentTheme = () => getStoredTheme() || THEMES.DARK

export const useTheme = () => {
    const [theme, setThemeState] = useState(getCurrentTheme)

    useEffect(() => {
        const handleThemeChange = (event) => {
            setThemeState(event.detail?.theme || getCurrentTheme())
        }

        const handleStorageChange = (event) => {
            if (event.key === THEME_STORAGE_KEY) {
                setThemeState(initTheme())
            }
        }

        window.addEventListener('themechange', handleThemeChange)
        window.addEventListener('storage', handleStorageChange)

        return () => {
            window.removeEventListener('themechange', handleThemeChange)
            window.removeEventListener('storage', handleStorageChange)
        }
    }, [])

    const setTheme = (nextTheme) => {
        setThemeState(saveTheme(nextTheme))
    }

    const colorMode = getThemeColorMode(theme)
    const themePalette = getThemePalette(theme)
    const isDarkTheme = colorMode === THEME_COLOR_MODES.DARK

    const setColorMode = (nextColorMode) => {
        setTheme(getThemeByPaletteAndMode({
            colorMode: nextColorMode,
            palette: themePalette,
        }))
    }

    const setThemePalette = (nextThemePalette) => {
        setTheme(getThemeByPaletteAndMode({
            colorMode,
            palette: nextThemePalette,
        }))
    }

    return {
        colorMode,
        isDarkTheme,
        setColorMode,
        setTheme,
        setThemePalette,
        theme,
        themePalette,
        toggleTheme: () => setColorMode(isDarkTheme ? THEME_COLOR_MODES.LIGHT : THEME_COLOR_MODES.DARK),
    }
}
