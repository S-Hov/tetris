import { clearFullLines } from "./clearFullLines"
import { mergePieceToBoard } from "./mergePieceToBoard"

export function lockPiece(board, piece, position) {
    const mergedBoard = mergePieceToBoard(board, piece, position)

    const { board: clearedBoard, clearedLinesCount, clearedRowIndices } = clearFullLines(mergedBoard)

    return {
        mergedBoard,
        board: clearedBoard,
        clearedLinesCount,
        clearedRowIndices,
    }
}
