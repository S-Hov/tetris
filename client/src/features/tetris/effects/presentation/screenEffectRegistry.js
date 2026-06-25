import DarknessCloudsScreenEffect from '../darkness/DarknessCloudsScreenEffect.jsx'
import FogPieceScreenEffect from '../fog-piece/FogPieceScreenEffect.jsx'

const screenEffectRegistry = {
    'darkness-clouds': DarknessCloudsScreenEffect,
    'fog-piece': FogPieceScreenEffect,
}

export const getScreenEffectComponent = (screenEffectKey) => (
    screenEffectRegistry[screenEffectKey] || null
)
