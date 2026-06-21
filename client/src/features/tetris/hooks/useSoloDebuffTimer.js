import { useEffect, useMemo, useRef, useState } from 'react'

import {
    SOLO_DEBUFF_INTERVAL_SECONDS,
} from '@/features/tetris/model/abilities.data.js'
import {
    getRandomEffects,
    toEffectPayload,
} from '@/features/tetris/effects/catalog.js'
import { applyIncomingEffect } from '@/features/tetris/effects/runtime.js'
import { withDerivedState } from '@/features/tetris/model/tetrisEngine.js'
import notify from '@/utils/Notifications'

const toMs = (seconds) => seconds * 1000

const getDebuffMessage = (ability) => {
    if (!ability) {
        return 'Игра применила случайный дебафф'
    }

    return `Подлянка от игры: ${ability.title}`
}

export const useSoloDebuffTimer = ({
    effects = [],
    enabled,
    paused,
    setGameState,
} = {}) => {
    const [remainingMs, setRemainingMs] = useState(() => toMs(SOLO_DEBUFF_INTERVAL_SECONDS))
    const remainingMsRef = useRef(toMs(SOLO_DEBUFF_INTERVAL_SECONDS))

    useEffect(() => {
        if (!enabled || paused) {
            return undefined
        }

        let lastTickAt = Date.now()

        const intervalId = window.setInterval(() => {
            const now = Date.now()
            const elapsedMs = now - lastTickAt
            lastTickAt = now
            const nextValue = remainingMsRef.current - elapsedMs

            if (nextValue > 0) {
                remainingMsRef.current = nextValue
                setRemainingMs(nextValue)
                return
            }

            const [ability] = getRandomEffects(effects, 1)
            const effect = toEffectPayload(ability)

            if (effect) {
                setGameState((prevState) => {
                    const derivedState = withDerivedState(prevState)

                    if (
                        derivedState.isGameOver ||
                        derivedState.isPaused ||
                        derivedState.isClearing ||
                        derivedState.isChoosingAbility
                    ) {
                        return prevState
                    }

                    return applyIncomingEffect(prevState, effect, { replaceActiveEffects: true })
                })
                notify(getDebuffMessage(ability), 'warning')
            }

            remainingMsRef.current = toMs(SOLO_DEBUFF_INTERVAL_SECONDS)
            setRemainingMs(remainingMsRef.current)
        }, 250)

        return () => window.clearInterval(intervalId)
    }, [effects, enabled, paused, setGameState])

    return useMemo(() => ({
        intervalSeconds: SOLO_DEBUFF_INTERVAL_SECONDS,
        progress: 1 - (remainingMs / toMs(SOLO_DEBUFF_INTERVAL_SECONDS)),
        secondsLeft: Math.max(0, Math.ceil(remainingMs / 1000)),
    }), [remainingMs])
}
