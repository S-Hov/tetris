import { useEffect, useState } from 'react'

import { getCachedEffectCatalog, loadEffectCatalog } from './catalog.js'

export const useEffectCatalog = () => {
    const [effects, setEffects] = useState(getCachedEffectCatalog)
    const [status, setStatus] = useState(() => effects.length > 0 ? 'ready' : 'loading')
    const [error, setError] = useState(null)

    useEffect(() => {
        if (effects.length > 0) {
            return undefined
        }

        let isCancelled = false

        loadEffectCatalog()
            .then((loadedEffects) => {
                if (!isCancelled) {
                    setEffects(loadedEffects)
                    setStatus('ready')
                }
            })
            .catch((loadError) => {
                if (!isCancelled) {
                    setError(loadError)
                    setStatus('error')
                }
            })

        return () => {
            isCancelled = true
        }
    }, [effects.length])

    return {
        effects,
        error,
        isLoading: status === 'loading',
        status,
    }
}
