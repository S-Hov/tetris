import { useCallback, useEffect, useRef } from 'react'

import { applyIncomingEffect } from '../runtime.js'

export const EFFECT_PREVIEW_EVENT = 'pvp-tetris:preview-effect'

export const useEffectPreview = ({
    enabled = true,
    forcePreviewMode = false,
    initialEffectKey = '',
    setGameState,
}) => {
    const appliedInitialEffectKeyRef = useRef('')
    const isPreviewMode = import.meta.env.DEV && (forcePreviewMode || Boolean(initialEffectKey))

    const previewEffect = useCallback((effect, options = {}) => {
        if (!import.meta.env.DEV || !enabled) {
            return false
        }

        const effectKey = typeof effect === 'string'
            ? effect
            : effect?.effectKey || effect?.key || effect?.id

        if (!effectKey) {
            return false
        }

        setGameState((currentState) => applyIncomingEffect(currentState, {
            durationMs: Number(options.durationMs ?? effect?.durationMs) || 8000,
            effectKey,
            parameters: options.parameters ?? effect?.parameters ?? {},
            type: effectKey,
        }, {
            replaceActiveEffects: options.replaceActiveEffects ?? true,
        }))

        return true
    }, [enabled, setGameState])

    const clearPreviewEffects = useCallback(() => {
        if (!import.meta.env.DEV) {
            return
        }

        setGameState((currentState) => ({
            ...currentState,
            activeEffects: [],
            effectFeedback: null,
        }))
    }, [setGameState])

    useEffect(() => {
        if (!import.meta.env.DEV) {
            return undefined
        }

        const handlePreviewEffect = (event) => {
            previewEffect(event.detail?.effectKey, event.detail)
        }

        window.addEventListener(EFFECT_PREVIEW_EVENT, handlePreviewEffect)

        return () => window.removeEventListener(EFFECT_PREVIEW_EVENT, handlePreviewEffect)
    }, [previewEffect])

    useEffect(() => {
        if (
            !isPreviewMode ||
            !enabled ||
            appliedInitialEffectKeyRef.current === initialEffectKey ||
            !initialEffectKey
        ) {
            return
        }

        appliedInitialEffectKeyRef.current = initialEffectKey
        previewEffect(initialEffectKey, {
            durationMs: 15000,
        })
    }, [enabled, initialEffectKey, isPreviewMode, previewEffect])

    return {
        clearPreviewEffects,
        isPreviewMode,
        previewEffect,
    }
}
