import { getEffectPresentation } from '../runtime.js'
import { getScreenEffectComponent } from './screenEffectRegistry.js'

const EffectScreenLayer = ({ activeEffects = [] }) => (
    <div className="effect-screen-layer" aria-hidden="true">
        {activeEffects.map((effect) => {
            const presentation = getEffectPresentation(effect)
            const ScreenEffect = getScreenEffectComponent(presentation?.screenEffect)

            if (!ScreenEffect) {
                return null
            }

            return (
                <ScreenEffect
                    effect={effect}
                    key={`${effect.effectKey}-${effect.expiresAt}`}
                    presentation={presentation}
                />
            )
        })}
    </div>
)

export default EffectScreenLayer
