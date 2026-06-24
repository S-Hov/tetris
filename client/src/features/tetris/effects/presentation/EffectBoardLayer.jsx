import { getEffectPresentation } from '../runtime.js'
import { getBoardEffectComponent } from './boardEffectRegistry.js'

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
    const feedbackEffect = getFeedbackEffect(activeEffects, feedback)
    const effects = feedbackEffect ? [...activeEffects, feedbackEffect] : activeEffects

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
