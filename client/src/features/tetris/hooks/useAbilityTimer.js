import { useEffect, useMemo, useState } from 'react'

import { resolveAbilityChoice } from '@/features/tetris/model/tetrisEngine.js'
import notify from '@/utils/Notifications'

const getAbilitySecondsLeft = (endsAt) => Math.max(0, Math.ceil(((endsAt ?? 0) - Date.now()) / 1000))

export const useAbilityTimer = ({
    abilityChoiceEndsAt,
    isChoosingAbility,
    randomPiece,
    setGameState,
} = {}) => {
    const [abilityTick, setAbilityTick] = useState(0)

    const abilitySecondsLeft = useMemo(() => {
        void abilityTick
        return isChoosingAbility ? getAbilitySecondsLeft(abilityChoiceEndsAt) : 0
    }, [abilityChoiceEndsAt, abilityTick, isChoosingAbility])

    useEffect(() => {
        if (!isChoosingAbility) {
            return undefined
        }

        const intervalId = setInterval(() => {
            setAbilityTick((currentValue) => currentValue + 1)
        }, 250)

        const timeoutId = setTimeout(() => {
            notify('Ability window expired', 'warning')
            setGameState((prevState) => resolveAbilityChoice(prevState, null, { randomPiece }))
        }, Math.max(0, (abilityChoiceEndsAt ?? Date.now()) - Date.now()))

        return () => {
            clearInterval(intervalId)
            clearTimeout(timeoutId)
        }
    }, [abilityChoiceEndsAt, isChoosingAbility, randomPiece, setGameState])

    return abilitySecondsLeft
}
