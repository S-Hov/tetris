import { useEffect, useState } from 'react'
import {
    INTERFACE_SHADOW_EVENTS,
    INTERFACE_SHADOW_STORAGE_KEY,
    getInterfaceShadowIntensity,
    initInterfaceShadowIntensity,
    saveInterfaceShadowIntensity,
} from '@/shared/lib/interface-shadow/shadow.js'

export const useInterfaceShadow = () => {
    const [shadowIntensity, setShadowIntensityState] = useState(getInterfaceShadowIntensity)

    useEffect(() => {
        const handleShadowChange = (event) => {
            setShadowIntensityState(event.detail?.intensity ?? getInterfaceShadowIntensity())
        }
        const handleStorageChange = (event) => {
            if (event.key === INTERFACE_SHADOW_STORAGE_KEY) {
                setShadowIntensityState(initInterfaceShadowIntensity())
            }
        }

        window.addEventListener(INTERFACE_SHADOW_EVENTS.CHANGE, handleShadowChange)
        window.addEventListener('storage', handleStorageChange)

        return () => {
            window.removeEventListener(INTERFACE_SHADOW_EVENTS.CHANGE, handleShadowChange)
            window.removeEventListener('storage', handleStorageChange)
        }
    }, [])

    const setShadowIntensity = (value) => {
        setShadowIntensityState(saveInterfaceShadowIntensity(value))
    }

    return { shadowIntensity, setShadowIntensity }
}
