import ControlsSwapBoardEffect from '../controls-swap/ControlsSwapBoardEffect.jsx'
import DelayInputBoardEffect from '../delay-input/DelayInputBoardEffect.jsx'
import GarbageRainBoardEffect from '../garbage-rain/GarbageRainBoardEffect.jsx'
import GravityLockBoardEffect from '../gravity-lock/GravityLockBoardEffect.jsx'
import SignalLossBoardEffect from '../invisible-cells/SignalLossBoardEffect.jsx'
import RandomRotationBoardEffect from '../random-rotation/RandomRotationBoardEffect.jsx'
import ScreenShakeBoardEffect from '../screen-shake/ScreenShakeBoardEffect.jsx'
import SpeedSurgeBoardEffect from '../speed-x2/SpeedSurgeBoardEffect.jsx'
import StickyWallsBoardEffect from '../sticky-walls/StickyWallsBoardEffect.jsx'

const boardEffectRegistry = {
    'controls-swap': ControlsSwapBoardEffect,
    'delay-input': DelayInputBoardEffect,
    'garbage-rain': GarbageRainBoardEffect,
    'gravity-lock': GravityLockBoardEffect,
    'signal-loss': SignalLossBoardEffect,
    'random-rotation': RandomRotationBoardEffect,
    'screen-shake': ScreenShakeBoardEffect,
    'speed-surge': SpeedSurgeBoardEffect,
    'sticky-walls': StickyWallsBoardEffect,
}

export const getBoardEffectComponent = (boardEffectKey) => (
    boardEffectRegistry[boardEffectKey] || null
)
