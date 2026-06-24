import DelayInputBoardEffect from '../delay-input/DelayInputBoardEffect.jsx'
import GarbageRainBoardEffect from '../garbage-rain/GarbageRainBoardEffect.jsx'
import RandomRotationBoardEffect from '../random-rotation/RandomRotationBoardEffect.jsx'
import StickyWallsBoardEffect from '../sticky-walls/StickyWallsBoardEffect.jsx'

const boardEffectRegistry = {
    'delay-input': DelayInputBoardEffect,
    'garbage-rain': GarbageRainBoardEffect,
    'random-rotation': RandomRotationBoardEffect,
    'sticky-walls': StickyWallsBoardEffect,
}

export const getBoardEffectComponent = (boardEffectKey) => (
    boardEffectRegistry[boardEffectKey] || null
)
