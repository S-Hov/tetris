import ControlsSwapBoardEffect from '../controls-swap/ControlsSwapBoardEffect.jsx'
import DelayInputBoardEffect from '../delay-input/DelayInputBoardEffect.jsx'
import GarbageRainBoardEffect from '../garbage-rain/GarbageRainBoardEffect.jsx'
import GravityLockBoardEffect from '../gravity-lock/GravityLockBoardEffect.jsx'
import RandomRotationBoardEffect from '../random-rotation/RandomRotationBoardEffect.jsx'
import ScreenShakeBoardEffect from '../screen-shake/ScreenShakeBoardEffect.jsx'
import StickyWallsBoardEffect from '../sticky-walls/StickyWallsBoardEffect.jsx'

const boardEffectRegistry = {
    'controls-swap': ControlsSwapBoardEffect,
    'delay-input': DelayInputBoardEffect,
    'garbage-rain': GarbageRainBoardEffect,
    'gravity-lock': GravityLockBoardEffect,
    'random-rotation': RandomRotationBoardEffect,
    'screen-shake': ScreenShakeBoardEffect,
    'sticky-walls': StickyWallsBoardEffect,
}

export const getBoardEffectComponent = (boardEffectKey) => (
    boardEffectRegistry[boardEffectKey] || null
)
