import RandomRotationBoardEffect from '../random-rotation/RandomRotationBoardEffect.jsx'
import StickyWallsBoardEffect from '../sticky-walls/StickyWallsBoardEffect.jsx'

const boardEffectRegistry = {
    'random-rotation': RandomRotationBoardEffect,
    'sticky-walls': StickyWallsBoardEffect,
}

export const getBoardEffectComponent = (boardEffectKey) => (
    boardEffectRegistry[boardEffectKey] || null
)
