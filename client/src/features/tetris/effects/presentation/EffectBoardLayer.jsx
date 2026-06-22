import { getEffectPresentation } from '../runtime.js'
import { getBoardEffectComponent } from './boardEffectRegistry.js'

const EffectBoardLayer = ({ activeEffects = [], feedback = null }) => (
    <div className="effect-board-layer" aria-hidden="true">
        {activeEffects.map((effect) => {
            const presentation = getEffectPresentation(effect)
            const BoardEffect = getBoardEffectComponent(presentation?.boardEffect)

            if (!BoardEffect) {
                return null
            }

            const isFeedbackActive = feedback?.effectKey === effect.effectKey

            return (
                <BoardEffect
                    effect={effect}
                    feedbackActive={isFeedbackActive}
                    key={`${effect.effectKey}-${isFeedbackActive ? feedback.sequence : 'idle'}`}
                />
            )
        })}
    </div>
)

export default EffectBoardLayer
