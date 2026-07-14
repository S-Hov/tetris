import { useEffect, useMemo, useState } from 'react'

import { getEffectPresentation } from '../runtime.js'
import { getBoardEffectComponent } from './boardEffectRegistry.js'

const FEEDBACK_VISIBILITY_MS = 850
const isEffectVisible = (effect, now) => !effect?.expiresAt || effect.expiresAt > now

const getFeedbackKey = (feedback) => (
    feedback?.sequence ? `${feedback.effectKey || 'unknown'}-${feedback.sequence}` : null
)

const getFeedbackEffect = (activeEffects, feedback, isFeedbackVisible) => {
    if (
        !isFeedbackVisible ||
        !feedback?.effectKey ||
        activeEffects.some((effect) => effect.effectKey === feedback.effectKey)
    ) {
        return null
    }

    const effect = {
        effectKey: feedback.effectKey,
        expiresAt: 0,
        type: feedback.effectKey,
    }
    const presentation = getEffectPresentation(effect)

    return getBoardEffectComponent(presentation?.boardEffect) ? effect : null
}

const EffectBoardLayer = ({ activeEffects = [], feedback = null }) => {
    const [now, setNow] = useState(() => Date.now())
    const feedbackKey = getFeedbackKey(feedback)
    const feedbackStartedAt = Number(feedback?.occurredAt || feedback?.queuedAt) || 0
    const visibleActiveEffects = useMemo(
        () => activeEffects.filter((effect) => isEffectVisible(effect, now)),
        [activeEffects, now]
    )
    const isFeedbackVisible = Boolean(feedbackKey) &&
        feedbackStartedAt > 0 &&
        now - feedbackStartedAt <= FEEDBACK_VISIBILITY_MS
    const feedbackEffect = getFeedbackEffect(visibleActiveEffects, feedback, isFeedbackVisible)
    const effects = feedbackEffect ? [...visibleActiveEffects, feedbackEffect] : visibleActiveEffects

    useEffect(() => {
        if (activeEffects.length === 0 && !feedbackKey) {
            return undefined
        }

        const intervalId = window.setInterval(() => setNow(Date.now()), 100)

        return () => window.clearInterval(intervalId)
    }, [activeEffects.length, feedbackKey])

    return (
        <div className="effect-board-layer" aria-hidden="true">
            {effects.map((effect) => {
                const presentation = getEffectPresentation(effect)
                const BoardEffect = getBoardEffectComponent(presentation?.boardEffect)

                if (!BoardEffect) {
                    return null
                }

                const isFeedbackActive = isFeedbackVisible && feedback?.effectKey === effect.effectKey
                const feedbackSequence = feedback?.effectKey === effect.effectKey
                    ? feedback.sequence
                    : null

                return (
                    <BoardEffect
                        effect={effect}
                        feedback={isFeedbackActive ? feedback : null}
                        feedbackActive={isFeedbackActive}
                        key={`${effect.effectKey}-${feedbackSequence || 'idle'}`}
                    />
                )
            })}
        </div>
    )
}

export default EffectBoardLayer
