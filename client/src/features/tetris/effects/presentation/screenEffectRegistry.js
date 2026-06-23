import DarknessCloudsScreenEffect from '../darkness/DarknessCloudsScreenEffect.jsx'

const screenEffectRegistry = {
    'darkness-clouds': DarknessCloudsScreenEffect,
}

export const getScreenEffectComponent = (screenEffectKey) => (
    screenEffectRegistry[screenEffectKey] || null
)
