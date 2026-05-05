import { BOARD_WIDTH } from "./createBoard"

export function getStartPosition(piece) {
    return {
        x: Math.floor((BOARD_WIDTH - piece.shape[0].length) / 2),
        y: 0,
    }
}
