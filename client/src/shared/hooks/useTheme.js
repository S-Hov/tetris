import { useEffect, useState } from 'react'
import { getStoredTheme, initTheme, saveTheme, THEMES, THEME_STORAGE_KEY } from '@/shared/lib/theme/theme.js'

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

    const isDarkTheme = theme === THEMES.DARK

    return {
        isDarkTheme,
        setTheme,
        theme,
        toggleTheme: () => setTheme(isDarkTheme ? THEMES.LIGHT : THEMES.DARK),
    }
}
