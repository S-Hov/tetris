import { useEffect, useState } from 'react'
import {
    GLOW_EFFECT_EVENTS,
    GLOW_EFFECT_STORAGE_KEY,
    getGlowEffectEnabled,
    initGlowEffect,
    saveGlowEffectEnabled,
} from '@/shared/lib/glow-effect/glowEffect.js'

export const useGlowEffect = () => {
    const [isGlowEffectEnabled, setGlowEffectState] = useState(getGlowEffectEnabled)

    useEffect(() => {
        const handleGlowEffectChange = (event) => {
            setGlowEffectState(event.detail?.enabled ?? getGlowEffectEnabled())
        }

        const handleStorageChange = (event) => {
            if (event.key === GLOW_EFFECT_STORAGE_KEY) {
                setGlowEffectState(initGlowEffect())
            }
        }

        window.addEventListener(GLOW_EFFECT_EVENTS.CHANGE, handleGlowEffectChange)
        window.addEventListener('storage', handleStorageChange)

        return () => {
            window.removeEventListener(GLOW_EFFECT_EVENTS.CHANGE, handleGlowEffectChange)
            window.removeEventListener('storage', handleStorageChange)
        }
    }, [])

    const setGlowEffectEnabled = (value) => {
        setGlowEffectState(saveGlowEffectEnabled(value))
    }

    return {
        isGlowEffectEnabled,
        setGlowEffectEnabled,
        toggleGlowEffect: () => setGlowEffectEnabled(!isGlowEffectEnabled),
    }
}
