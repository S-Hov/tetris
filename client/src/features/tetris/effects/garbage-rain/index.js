import { isCurrentPieceCell, normalizeNumber } from '../effectUtils.js'

const getColumnSupportY = (board, x) => {
    const boardHeight = board.length

    for (let y = 0; y < boardHeight; y += 1) {
        if (board[y]?.[x]) {
            return y
        }
    }

    return boardHeight
}

const getLandingCandidates = (state, board, initialSupports, parameters) => {
    const { maxColumnRise, topSafeRows } = parameters
    const candidates = []

    for (let x = 0; x < (board[0]?.length || 0); x += 1) {
        const supportY = getColumnSupportY(board, x)
        const y = supportY - 1

        if (
            y < topSafeRows ||
            y < initialSupports[x] - maxColumnRise ||
            !board[y] ||
            board[y][x] ||
            isCurrentPieceCell(state, x, y) ||
            board[y].filter((cell) => !cell).length <= 1
        ) {
            continue
        }

        candidates.push({ x, y })
    }

    return candidates
}

export default {
    effectKey: 'garbage_rain',
    normalizeParameters: (parameters = {}) => ({
        minBlocks: normalizeNumber(parameters.minBlocks, 6, { min: 0 }),
        maxBlocks: normalizeNumber(parameters.maxBlocks, 10, { min: 0 }),
        maxColumnRise: normalizeNumber(parameters.maxColumnRise, 3, { min: 1 }),
        topSafeRows: normalizeNumber(parameters.topSafeRows, 8, { min: 0 }),
    }),
    apply: (state, effect, { now = Date.now(), random = Math.random } = {}) => {
        const board = state.board.map((row) => [...row])
        const { minBlocks, maxBlocks } = effect.parameters
        const targetBlocks = minBlocks + Math.floor(random() * (maxBlocks - minBlocks + 1))
        const initialSupports = Array.from(
            { length: board[0]?.length || 0 },
            (_, x) => getColumnSupportY(board, x)
        )
        const placements = []
        let placedBlocks = 0

        while (placedBlocks < targetBlocks) {
            const candidates = getLandingCandidates(state, board, initialSupports, effect.parameters)

            if (candidates.length === 0) {
                break
            }

            const candidate = candidates[Math.floor(random() * candidates.length)]
            const row = board[candidate.y]

            if (row.filter((cell) => !cell).length <= 1) {
                continue
            }

            row[candidate.x] = {
                type: 'garbage',
                variant: 'filled',
            }
            placements.push({
                delayMs: placedBlocks * 95,
                x: candidate.x,
                y: candidate.y,
            })
            placedBlocks += 1
        }

        return {
            ...state,
            activeEffects: (state.activeEffects || []).filter((item) => item.effectKey !== effect.effectKey),
            board,
            effectFeedback: placements.length > 0
                ? {
                    effectKey: effect.effectKey,
                    occurredAt: now,
                    placements,
                    sequence: (state.effectFeedback?.sequence || 0) + 1,
                    type: 'garbageDrop',
                }
                : state.effectFeedback,
        }
    },
    presentation: {
        accent: '#ffb13b',
        boardEffect: 'garbage-rain',
        icon: 'fa-cubes',
        label: 'Мусорный дождь',
        theme: 'garbage-rain',
        audio: {
            feedbackSequence: {
                maxEvents: 10,
                source: 'placements',
                voices: [
                    { type: 'square', frequency: 118, endFrequency: 52, duration: 0.085, gain: 0.2 },
                    { type: 'triangle', frequency: 520, endFrequency: 180, duration: 0.055, gain: 0.07, delay: 0.018 },
                ],
                volume: 0.34,
            },
        },
    },
}
