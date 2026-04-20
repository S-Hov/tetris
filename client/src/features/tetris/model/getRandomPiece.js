import { PIECES } from './pieces.js'

export function getRandomPiece() {
    const pieceKeys = Object.keys(PIECES)
    const randomKey = pieceKeys[Math.floor(Math.random() * pieceKeys.length)]
    return PIECES[randomKey]
}