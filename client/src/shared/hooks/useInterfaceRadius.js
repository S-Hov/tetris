import { useEffect, useState } from 'react'
import {
    INTERFACE_RADIUS_EVENTS,
    INTERFACE_RADIUS_STORAGE_KEY,
    getInterfaceRadiusSettings,
    initInterfaceRadiusSettings,
    saveInterfaceRadiusSettings,
} from '@/shared/lib/interface-radius/radius.js'

export const useInterfaceRadius = () => {
    const [radiusSettings, setRadiusSettingsState] = useState(getInterfaceRadiusSettings)

    useEffect(() => {
        const handleRadiusChange = (event) => {
            setRadiusSettingsState(event.detail?.settings || getInterfaceRadiusSettings())
        }

        const handleStorageChange = (event) => {
            if (event.key === INTERFACE_RADIUS_STORAGE_KEY) {
                setRadiusSettingsState(initInterfaceRadiusSettings())
            }
        }

        window.addEventListener(INTERFACE_RADIUS_EVENTS.CHANGE, handleRadiusChange)
        window.addEventListener('storage', handleStorageChange)

        return () => {
            window.removeEventListener(INTERFACE_RADIUS_EVENTS.CHANGE, handleRadiusChange)
            window.removeEventListener('storage', handleStorageChange)
        }
    }, [])

    const setRadiusSettings = (nextSettings) => {
        setRadiusSettingsState(saveInterfaceRadiusSettings(nextSettings))
    }

    const setRadiusSetting = (key, value) => {
        setRadiusSettings({
            ...radiusSettings,
            [key]: {
                ...radiusSettings[key],
                ...value,
            },
        })
    }

    return {
        radiusSettings,
        setRadiusSetting,
        setRadiusSettings,
    }
}
