import { useEffect, useState } from 'react'
import {
    INTERFACE_SCALE_EVENTS,
    INTERFACE_SCALE_STORAGE_KEY,
    getInterfaceScale,
    initInterfaceScale,
    saveInterfaceScale,
} from '@/shared/lib/interface-scale/scale.js'

export const useInterfaceScale = () => {
    const [interfaceScale, setInterfaceScaleState] = useState(getInterfaceScale)

    useEffect(() => {
        const handleScaleChange = (event) => {
            setInterfaceScaleState(event.detail?.scale || getInterfaceScale())
        }

        const handleStorageChange = (event) => {
            if (event.key === INTERFACE_SCALE_STORAGE_KEY) {
                setInterfaceScaleState(initInterfaceScale())
            }
        }

        window.addEventListener(INTERFACE_SCALE_EVENTS.CHANGE, handleScaleChange)
        window.addEventListener('storage', handleStorageChange)

        return () => {
            window.removeEventListener(INTERFACE_SCALE_EVENTS.CHANGE, handleScaleChange)
            window.removeEventListener('storage', handleStorageChange)
        }
    }, [])

    const setInterfaceScale = (scale) => {
        setInterfaceScaleState(saveInterfaceScale(scale))
    }

    return {
        interfaceScale,
        setInterfaceScale,
    }
}
