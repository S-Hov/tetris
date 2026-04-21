export function paintPieceOnBoard(board, piece, position, options = {}) {
    const newBoard = board.map((row) => [...row])
    const shape = piece.shape
    const {
        value,
        overwrite = true,
    } = options

    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                const boardY = position.y + y
                const boardX = position.x + x

                if (!overwrite && newBoard[boardY][boardX] !== 0) {
                    continue
                }

                newBoard[boardY][boardX] = value ?? {
                    type: piece.type,
                    variant: 'filled',
                }
            }
        }
    }

    return newBoard
}
