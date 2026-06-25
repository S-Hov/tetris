import { useEffect, useMemo, useState } from 'react'

import { getEffectPresentation } from '../runtime.js'
import { getBoardEffectComponent } from './boardEffectRegistry.js'

const isEffectVisible = (effect, now) => !effect?.expiresAt || effect.expiresAt > now

const getFeedbackEffect = (activeEffects, feedback) => {
    if (!feedback?.effectKey || activeEffects.some((effect) => effect.effectKey === feedback.effectKey)) {
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
    const visibleActiveEffects = useMemo(
        () => activeEffects.filter((effect) => isEffectVisible(effect, now)),
        [activeEffects, now]
    )
    const feedbackEffect = getFeedbackEffect(visibleActiveEffects, feedback)
    const effects = feedbackEffect ? [...visibleActiveEffects, feedbackEffect] : visibleActiveEffects

    useEffect(() => {
        if (activeEffects.length === 0) {
            return undefined
        }

        const intervalId = window.setInterval(() => setNow(Date.now()), 100)

        return () => window.clearInterval(intervalId)
    }, [activeEffects.length])

    return (
        <div className="effect-board-layer" aria-hidden="true">
            {effects.map((effect) => {
                const presentation = getEffectPresentation(effect)
                const BoardEffect = getBoardEffectComponent(presentation?.boardEffect)

                if (!BoardEffect) {
                    return null
                }

                const isFeedbackActive = feedback?.effectKey === effect.effectKey

                return (
                    <BoardEffect
                        effect={effect}
                        feedback={isFeedbackActive ? feedback : null}
                        feedbackActive={isFeedbackActive}
                        key={`${effect.effectKey}-${isFeedbackActive ? feedback.sequence : 'idle'}`}
                    />
                )
            })}
        </div>
    )
}

export default EffectBoardLayer
