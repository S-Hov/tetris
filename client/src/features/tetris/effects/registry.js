import controlsSwap from './controls-swap/index.js'
import darkness from './darkness/index.js'
import delayInput from './delay-input/index.js'
import fogPiece from './fog-piece/index.js'
import garbageRain from './garbage-rain/index.js'
import gravityLock from './gravity-lock/index.js'
import invisibleCells from './invisible-cells/index.js'
import randomRotation from './random-rotation/index.js'
import screenShake from './screen-shake/index.js'
import speedX2 from './speed-x2/index.js'
import stickyWalls from './sticky-walls/index.js'

const implementations = [
    speedX2,
    darkness,
    garbageRain,
    controlsSwap,
    fogPiece,
    gravityLock,
    screenShake,
    randomRotation,
    stickyWalls,
    delayInput,
    invisibleCells,
]

export const effectRegistry = Object.fromEntries(
    implementations.map((implementation) => [implementation.effectKey, implementation])
)

export const getEffectImplementation = (effectKey) => effectRegistry[effectKey] || null

export const isEffectSupported = (effectKey) => Boolean(getEffectImplementation(effectKey))
