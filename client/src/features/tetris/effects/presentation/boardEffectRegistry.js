import ControlsSwapBoardEffect from '../controls-swap/ControlsSwapBoardEffect.jsx'
import DelayInputBoardEffect from '../delay-input/DelayInputBoardEffect.jsx'
import GarbageRainBoardEffect from '../garbage-rain/GarbageRainBoardEffect.jsx'
import GravityLockBoardEffect from '../gravity-lock/GravityLockBoardEffect.jsx'
import RandomRotationBoardEffect from '../random-rotation/RandomRotationBoardEffect.jsx'
import StickyWallsBoardEffect from '../sticky-walls/StickyWallsBoardEffect.jsx'

const boardEffectRegistry = {
    'controls-swap': ControlsSwapBoardEffect,
    'delay-input': DelayInputBoardEffect,
    'garbage-rain': GarbageRainBoardEffect,
    'gravity-lock': GravityLockBoardEffect,
    'random-rotation': RandomRotationBoardEffect,
    'sticky-walls': StickyWallsBoardEffect,
}

export const getBoardEffectComponent = (boardEffectKey) => (
    boardEffectRegistry[boardEffectKey] || null
)
