import { useEffect, useMemo, useState } from 'react'

const COUNTDOWN_STEP_MS = 920
const COUNTDOWN_VALUES = [3, 2, 1]
const COUNTDOWN_DURATION_MS = COUNTDOWN_STEP_MS * COUNTDOWN_VALUES.length

export const useGameCountdown = ({ startedAt = 0 } = {}) => {
    const [now, setNow] = useState(() => Date.now())
    const elapsedMs = Math.max(0, now - startedAt)
    const isCountingDown = elapsedMs < COUNTDOWN_DURATION_MS
    const stepIndex = Math.min(
        Math.floor(elapsedMs / COUNTDOWN_STEP_MS),
        COUNTDOWN_VALUES.length - 1
    )

    useEffect(() => {
        if (!isCountingDown) {
            return undefined
        }

        const nextStepMs = (stepIndex + 1) * COUNTDOWN_STEP_MS
        const nextDelay = Math.max(16, nextStepMs - elapsedMs)
        const timeoutId = setTimeout(() => {
            setNow(Date.now())
        }, nextDelay)

        return () => clearTimeout(timeoutId)
    }, [elapsedMs, isCountingDown, startedAt, stepIndex])

    return useMemo(() => ({
        countdownValue: COUNTDOWN_VALUES[stepIndex],
        isCountingDown,
    }), [isCountingDown, stepIndex])
}
