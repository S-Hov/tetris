import { useEffect, useState } from 'react'
import {
    ACCENT_COLOR_EVENTS,
    ACCENT_COLOR_STORAGE_KEY,
    getAccentColor,
    initAccentColor,
    saveAccentColor,
} from '@/shared/lib/accent-color/accentColor.js'

export const useAccentColor = () => {
    const [accentColor, setAccentColorState] = useState(getAccentColor)

    useEffect(() => {
        const handleAccentColorChange = (event) => {
            setAccentColorState(event.detail?.color || getAccentColor())
        }

        const handleStorageChange = (event) => {
            if (event.key === ACCENT_COLOR_STORAGE_KEY) {
                setAccentColorState(initAccentColor())
            }
        }

        window.addEventListener(ACCENT_COLOR_EVENTS.CHANGE, handleAccentColorChange)
        window.addEventListener('storage', handleStorageChange)

        return () => {
            window.removeEventListener(ACCENT_COLOR_EVENTS.CHANGE, handleAccentColorChange)
            window.removeEventListener('storage', handleStorageChange)
        }
    }, [])

    const setAccentColor = (color) => {
        setAccentColorState(saveAccentColor(color))
    }

    return {
        accentColor,
        setAccentColor,
    }
}
