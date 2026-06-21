import { isCurrentPieceCell, normalizeNumber } from '../effectUtils.js'

export default {
    effectKey: 'garbage_rain',
    normalizeParameters: (parameters = {}) => ({
        minBlocks: normalizeNumber(parameters.minBlocks, 6, { min: 0 }),
        maxBlocks: normalizeNumber(parameters.maxBlocks, 10, { min: 0 }),
        topSafeRows: normalizeNumber(parameters.topSafeRows, 8, { min: 0 }),
    }),
    apply: (state, effect, { random = Math.random } = {}) => {
        const board = state.board.map((row) => [...row])
        const { minBlocks, maxBlocks, topSafeRows } = effect.parameters
        const targetBlocks = minBlocks + Math.floor(random() * (maxBlocks - minBlocks + 1))
        const candidates = []

        board.forEach((row, y) => {
            if (y < topSafeRows || row.filter((cell) => !cell).length <= 1) {
                return
            }

            row.forEach((cell, x) => {
                if (!cell && !isCurrentPieceCell(state, x, y)) {
                    candidates.push({ x, y })
                }
            })
        })

        const shuffledCandidates = candidates.sort(() => random() - 0.5)
        let placedBlocks = 0

        for (const candidate of shuffledCandidates) {
            if (placedBlocks >= targetBlocks) {
                break
            }

            const row = board[candidate.y]

            if (row.filter((cell) => !cell).length <= 1) {
                continue
            }

            row[candidate.x] = {
                type: 'garbage',
                variant: 'filled',
            }
            placedBlocks += 1
        }

        return {
            ...state,
            board,
        }
    },
    presentation: {},
}
