import { PIECES } from './pieces.js'
import { SPECIAL_PIECES } from './specialPieces.js'

export function getRandomPiece() {
    const pieceKeys = Object.keys(PIECES)
    const randomKey = pieceKeys[Math.floor(Math.random() * pieceKeys.length)]
    return PIECES[randomKey]
}

export function getRandomPieceWithSpecialBlocks() {
    const piecePool = {
        ...PIECES,
        ...SPECIAL_PIECES,
    }
    const pieceKeys = Object.keys(piecePool)
    const randomKey = pieceKeys[Math.floor(Math.random() * pieceKeys.length)]

    return piecePool[randomKey]
}
