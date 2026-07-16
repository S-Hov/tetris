import { useEffect, useState } from 'react'

import { cosmeticsAPI } from '@/shared/api/cosmetics/index.js'
import { useAuth } from '@/shared/hooks/useAuth.js'
import { loadSkinPreset } from './skinPresetLoader.js'

export const useActiveSkinPack = () => {
    const { isAuth, isLoading, user } = useAuth()
    const [loadedSkin, setLoadedSkin] = useState({ preset: 'default', userId: null })

    useEffect(() => {
        if (isLoading) return undefined

        if (!isAuth) return undefined

        const controller = new AbortController()

        cosmeticsAPI.getLoadout({ signal: controller.signal })
            .then(async ({ loadout }) => {
                const preset = loadout?.manifest?.data?.preset
                    || loadout?.item?.metadata?.cssPreset
                    || loadout?.item?.key

                const loadedPreset = await loadSkinPreset(preset)

                if (controller.signal.aborted) return

                setLoadedSkin({
                    preset: loadedPreset,
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
