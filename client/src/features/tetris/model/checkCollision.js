export function checkCollision(board, piece, position) {
    for (let y = 0; y < piece.length; y++) {
        for (let x = 0; x < piece[y].length; x++) {
            if (!piece[y][x]) continue

            const boardY = position.y + y
            const boardX = position.x + x

            if (boardY < 0 || boardY >= board.length) return true
            if (boardX < 0 || boardX >= board[0].length) return true

            if (board[boardY][boardX] !== 0) return true
        }
    }

    return false
}