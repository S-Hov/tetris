import { useEffect, useMemo, useState } from 'react'

import {
    SOLO_DEBUFF_INTERVAL_SECONDS,
    getAbilityEffect,
    getRandomDebuffs,
} from '@/features/tetris/model/abilities.data.js'
import { applyIncomingEffect, withDerivedState } from '@/features/tetris/model/tetrisEngine.js'
import notify from '@/utils/Notifications'

const toMs = (seconds) => seconds * 1000

const getDebuffMessage = (ability) => {
    if (!ability) {
        return 'Игра применила случайный дебафф'
    }

    return `Подлянка от игры: ${ability.title}`
}

export const useSoloDebuffTimer = ({
    enabled,
    paused,
    setGameState,
} = {}) => {
    const [remainingMs, setRemainingMs] = useState(() => toMs(SOLO_DEBUFF_INTERVAL_SECONDS))

    useEffect(() => {
        if (!enabled || paused) {
            return undefined
        }

        let lastTickAt = Date.now()

        const intervalId = window.setInterval(() => {
            const now = Date.now()
            const elapsedMs = now - lastTickAt
            lastTickAt = now

            setRemainingMs((currentValue) => {
                const nextValue = currentValue - elapsedMs

                if (nextValue > 0) {
                    return nextValue
                }

                const [ability] = getRandomDebuffs(1)
                const effect = getAbilityEffect(ability?.id)

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

                        return applyIncomingEffect(prevState, effect)
                    })
                    notify(getDebuffMessage(ability), 'warning')
                }

                return toMs(SOLO_DEBUFF_INTERVAL_SECONDS)
            })
        }, 250)

        return () => window.clearInterval(intervalId)
    }, [enabled, paused, setGameState])

    return useMemo(() => ({
        intervalSeconds: SOLO_DEBUFF_INTERVAL_SECONDS,
        progress: 1 - (remainingMs / toMs(SOLO_DEBUFF_INTERVAL_SECONDS)),
        secondsLeft: Math.max(0, Math.ceil(remainingMs / 1000)),
    }), [remainingMs])
}
