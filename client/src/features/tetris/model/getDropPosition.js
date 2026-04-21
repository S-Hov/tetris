import { checkCollision } from "./checkCollision"

export function getDropPosition(board, piece, position) {
    let y = position.y

    while (!checkCollision(board, piece, { ...position, y: y + 1 })) {
        y++
    }

    return y
}