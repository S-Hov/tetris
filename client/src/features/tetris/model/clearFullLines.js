import { BOARD_WIDTH } from './createBoard.js'

export function clearFullLines(board) {
    const clearedRowIndices = []
    const filteredBoard = board.filter((row, rowIndex) => {
        const isFull = row.every((cell) => cell !== 0)

        if (isFull) {
            clearedRowIndices.push(rowIndex)
        }

        return !isFull
    })

    const clearedLinesCount = board.length - filteredBoard.length

    const newRows = Array.from({ length: clearedLinesCount }, () =>
        Array(BOARD_WIDTH).fill(0)
    )

    return {
        board: [...newRows, ...filteredBoard],
        clearedLinesCount,
        clearedRowIndices,
    }
}
