import { useEffect, useState } from 'react'
import {
    INTERFACE_BLUR_EVENTS,
    INTERFACE_BLUR_STORAGE_KEY,
    getInterfaceBlurSettings,
    initInterfaceBlurSettings,
    saveInterfaceBlurSettings,
} from '@/shared/lib/interface-blur/blur.js'

export const useInterfaceBlur = () => {
    const [blurSettings, setBlurSettingsState] = useState(getInterfaceBlurSettings)

    useEffect(() => {
        const handleBlurChange = (event) => {
            setBlurSettingsState(event.detail?.settings || getInterfaceBlurSettings())
        }

        const handleStorageChange = (event) => {
            if (event.key === INTERFACE_BLUR_STORAGE_KEY) {
                setBlurSettingsState(initInterfaceBlurSettings())
            }
        }

        window.addEventListener(INTERFACE_BLUR_EVENTS.CHANGE, handleBlurChange)
        window.addEventListener('storage', handleStorageChange)

        return () => {
            window.removeEventListener(INTERFACE_BLUR_EVENTS.CHANGE, handleBlurChange)
            window.removeEventListener('storage', handleStorageChange)
        }
    }, [])

    const setBlurSettings = (nextSettings) => {
        setBlurSettingsState(saveInterfaceBlurSettings(nextSettings))
    }

    const setBlurSetting = (key, value) => {
        setBlurSettings({
            ...blurSettings,
            [key]: value,
        })
    }

    return {
        blurSettings,
        setBlurSetting,
        setBlurSettings,
    }
}
