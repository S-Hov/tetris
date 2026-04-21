export function checkCollision(board, piece, position) {
    const shape = piece.shape

    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (!shape[y][x]) continue

            const boardY = position.y + y
            const boardX = position.x + x

            if (boardY < 0 || boardY >= board.length) return true
            if (boardX < 0 || boardX >= board[0].length) return true

            if (board[boardY][boardX] !== 0) return true
        }
    }

    return false
}
