import StickyWallsBoardEffect from '../sticky-walls/StickyWallsBoardEffect.jsx'

const boardEffectRegistry = {
    'sticky-walls': StickyWallsBoardEffect,
}

export const getBoardEffectComponent = (boardEffectKey) => (
    boardEffectRegistry[boardEffectKey] || null
)
