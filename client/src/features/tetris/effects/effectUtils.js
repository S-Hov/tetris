export const getPieceCells = (piece, position) => {
    const cells = []

    piece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (cell) {
                cells.push({
                    x: position.x + x,
                    y: position.y + y,
                })
            }
        })
    })

    return cells
}

export const touchesHorizontalWall = (state) => {
    const boardWidth = state.board[0]?.length ?? 0

    return getPieceCells(state.currentPiece, state.currentPosition).some(
        (cell) => cell.x <= 0 || cell.x >= boardWidth - 1
    )
}

export const isCurrentPieceCell = (state, x, y) => (
    getPieceCells(state.currentPiece, state.currentPosition).some(
        (cell) => cell.x === x && cell.y === y
    )
)

export const normalizeNumber = (value, fallback, { min = -Infinity, max = Infinity } = {}) => {
    const number = Number(value)

    return Number.isFinite(number)
        ? Math.min(Math.max(number, min), max)
        : fallback
}
