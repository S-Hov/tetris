export const BOARD_WIDTH = 10
export const BOARD_HEIGHT = 21

export function createBoard() {
    return Array.from({ length: BOARD_HEIGHT }, () =>
        Array(BOARD_WIDTH).fill(0)
    )
}
