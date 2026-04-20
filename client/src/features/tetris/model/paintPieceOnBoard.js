export function paintPieceOnBoard(board, piece, position) {
    const newBoard = board.map((row) => [...row])

    for (let y = 0; y < piece.length; y++) {
        for (let x = 0; x < piece[y].length; x++) {
            if (piece[y][x]) {
                newBoard[position.y + y][position.x + x] = piece[y][x]
            }
        }
    }

    return newBoard
}