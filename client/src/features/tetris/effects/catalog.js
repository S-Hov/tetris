import { effectsAPI } from '@/shared/api/effects'
import { getBaseUrl } from '@/shared/api/apiClient.js'

import { isEffectSupported } from './registry.js'

let catalog = []
let catalogPromise = null

const normalizeEffect = (effect) => ({
    ...effect,
    id: effect.id || effect.key,
    key: effect.key || effect.id,
    effectKey: effect.effectKey || effect.key || effect.id,
    durationMs: Math.max(0, Number(effect.durationMs) || 0),
    enabled: effect.enabled !== false,
    imageUrl: normalizeAssetUrl(effect.imageUrl || effect.image_url || ''),
    parameters: effect.parameters && typeof effect.parameters === 'object'
        ? effect.parameters
        : {},
})

const normalizeAssetUrl = (value) => {
    if (!value || /^(https?:)?\/\//i.test(value) || String(value).startsWith('data:')) {
        return value || ''
    }

    return `${getBaseUrl()}${String(value).startsWith('/') ? value : `/${value}`}`
}

export const loadEffectCatalog = async () => {
    if (catalog.length > 0) {
        return catalog
    }

    if (!catalogPromise) {
        catalogPromise = effectsAPI.getEffects()
            .then((response) => {
                catalog = (response.effects || [])
                    .map(normalizeEffect)
                    .filter((effect) => effect.effectKey && effect.enabled)

                return catalog
            })
            .catch((error) => {
                catalogPromise = null
                throw error
            })
    }

    return catalogPromise
}

export const getCachedEffectCatalog = () => catalog

export const getSupportedEffects = (effects = catalog) => (
    effects.filter((effect) => isEffectSupported(effect.effectKey))
)

export const getRandomEffects = (effects, count = 3, random = Math.random) => (
    getSupportedEffects(effects)
        .slice()
        .sort(() => random() - 0.5)
        .slice(0, Math.min(count, effects.length))
)

export const toEffectPayload = (effect) => effect ? ({
    effectKey: effect.effectKey,
    type: effect.effectKey,
    durationMs: effect.durationMs,
    parameters: effect.parameters,
}) : null

export const resetEffectCatalogCache = () => {
    catalog = []
    catalogPromise = null
}
