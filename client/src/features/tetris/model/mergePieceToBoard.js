export function mergePieceToBoard(board, piece, position) {
    const newBoard = board.map((row) => [...row])
    const shape = piece.shape

    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x]) {
                newBoard[position.y + y][position.x + x] = {
                    type: piece.type,
                    variant: 'filled',
                }
            }
        }
    }

    return newBoard
}
