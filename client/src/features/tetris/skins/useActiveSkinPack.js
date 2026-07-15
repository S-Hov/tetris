import { useEffect, useState } from 'react'

import { cosmeticsAPI } from '@/shared/api/cosmetics/index.js'
import { useAuth } from '@/shared/hooks/useAuth.js'

const AVAILABLE_SKIN_PRESETS = new Set(['default', 'depth-core', 'friend-glow', 'friend-glow-color'])

const normalizeSkinPreset = (value) => {
    const preset = String(value || 'default').replaceAll('_', '-').toLowerCase()
    return AVAILABLE_SKIN_PRESETS.has(preset) ? preset : 'default'
}

export const useActiveSkinPack = () => {
    const { isAuth, isLoading, user } = useAuth()
    const [loadedSkin, setLoadedSkin] = useState({ preset: 'default', userId: null })

    useEffect(() => {
        if (isLoading) return undefined

        if (!isAuth) return undefined

        const controller = new AbortController()

        cosmeticsAPI.getLoadout({ signal: controller.signal })
            .then(({ loadout }) => {
                const preset = loadout?.manifest?.data?.preset
                    || loadout?.item?.metadata?.cssPreset
                    || loadout?.item?.key

                setLoadedSkin({
                    preset: normalizeSkinPreset(preset),
                    userId: user?.id,
                })
            })
            .catch((error) => {
                if (error?.name !== 'AbortError') {
                    setLoadedSkin({ preset: 'default', userId: user?.id })
                }
            })

        return () => controller.abort()
    }, [isAuth, isLoading, user?.id])

    if (!isAuth || loadedSkin.userId !== user?.id) return 'default'

    return loadedSkin.preset
}

export const getTetrisSkinClassName = (skinPreset) => (
    `tetris-skin--${normalizeSkinPreset(skinPreset)}`
)
