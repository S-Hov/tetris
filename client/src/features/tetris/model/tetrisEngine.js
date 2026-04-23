import { createBoard } from './createBoard.js'
import { paintPieceOnBoard } from './paintPieceOnBoard.js'
import { checkCollision } from './checkCollision.js'
import { getRandomPiece } from './getRandomPiece.js'
import { rotatePiece } from './rotatePiece.js'
import { getDropPosition } from './getDropPosition.js'
import { lockPiece } from './lockPiece.js'
import { getStartPosition } from './getStartPosition.js'
import { getScoreForLines } from './getScoreForLines.js'
import { getEnergyForLines } from './getEnergyForLines.js'
import { ABILITY_CHOICE_DURATION_MS, getRandomDebuffs } from './abilities.data.js'

export const LINE_CLEAR_ANIMATION_MS = 250
export const ROTATION_KICK_OFFSETS = [0, -1, 1, -2, 2]

function createPieceGenerator(randomPiece) {
    return randomPiece ?? getRandomPiece
}

function getLevelForScore(score) {
    return Math.floor(score / 1000) + 1
}

function withLevel(state) {
    return {
        ...state,
        level: getLevelForScore(state.score),
    }
}

function canRunGameTick(state) {
    return !state.isGameOver && !state.isPaused && !state.isClearing
}

function spawnPreparedPiece(state, board, currentPiece, nextPiece, currentPosition) {
    if (checkCollision(board, currentPiece, currentPosition)) {
        return {
            ...state,
            board,
            isGameOver: true,
            pendingClear: null,
            clearingRows: [],
        }
    }

    return {
        ...state,
        board,
        currentPiece,
        nextPiece,
        currentPosition,
        pendingClear: null,
        clearingRows: [],
    }
}

function lockCurrentPiece(state, options = {}) {
    const randomPiece = createPieceGenerator(options.randomPiece)
    const {
        mergedBoard,
        board: clearedBoard,
        clearedLinesCount,
        clearedRowIndices,
    } = lockPiece(state.board, state.currentPiece, state.currentPosition)

    const queuedPiece = state.nextPiece
    const upcomingPiece = randomPiece()
    const startPosition = getStartPosition(queuedPiece)

    if (clearedLinesCount > 0) {
        return {
            ...state,
            board: mergedBoard,
            clearingRows: clearedRowIndices,
            pendingClear: {
                board: clearedBoard,
                clearedLinesCount,
                currentPiece: queuedPiece,
                nextPiece: upcomingPiece,
                currentPosition: startPosition,
            },
        }
    }

    return spawnPreparedPiece(
        state,
        clearedBoard,
        queuedPiece,
        upcomingPiece,
        startPosition
    )
}

export function createGameState(options = {}) {
    const randomPiece = createPieceGenerator(options.randomPiece)
    const currentPiece = randomPiece()
    const nextPiece = randomPiece()

    return {
        board: createBoard(),
        currentPiece,
        nextPiece,
        currentPosition: getStartPosition(currentPiece),
        isGameOver: false,
        score: 0,
        level: 1,
        linesCleared: 0,
        isPaused: false,
        clearingRows: [],
        pendingClear: null,
        energy: 0,
        isChoosingAbility: false,
        abilityOptions: [],
        abilityChoiceEndsAt: null,
    }
}

export function restartGame(options = {}) {
    return createGameState(options)
}

export function resolveLineClear(state) {
    if (!state.pendingClear) {
        return state
    }

    const nextState = withLevel({
        ...state,
        board: state.pendingClear.board,
        score: state.score + getScoreForLines(state.pendingClear.clearedLinesCount),
        energy: Math.min(100, state.energy + getEnergyForLines(state.pendingClear.clearedLinesCount)),
        linesCleared: state.linesCleared + state.pendingClear.clearedLinesCount,
    })

    if (nextState.energy >= 100) {
        return {
            ...nextState,
            isChoosingAbility: true,
            abilityOptions: getRandomDebuffs(),
            abilityChoiceEndsAt: Date.now() + ABILITY_CHOICE_DURATION_MS,
        }
    }

    return spawnPreparedPiece(
        nextState,
        state.pendingClear.board,
        state.pendingClear.currentPiece,
        state.pendingClear.nextPiece,
        state.pendingClear.currentPosition
    )
}

export function resolveAbilityChoice(state, selectedAbility = null) {
    const nextState = {
        ...state,
        energy: Math.max(0, state.energy - 100),
        isChoosingAbility: false,
        abilityOptions: [],
        abilityChoiceEndsAt: null,
        selectedAbility,
    }

    if (!state.pendingClear) {
        return nextState
    }

    return spawnPreparedPiece(
        nextState,
        state.pendingClear.board,
        state.pendingClear.currentPiece,
        state.pendingClear.nextPiece,
        state.pendingClear.currentPosition
    )
}

export function togglePause(state) {
    if (state.isGameOver) {
        return state
    }

    return {
        ...state,
        isPaused: !state.isPaused,
    }
}

export function movePiece(state, delta) {
    if (!canRunGameTick(state)) {
        return state
    }

    const nextPosition = {
        x: state.currentPosition.x + delta.x,
        y: state.currentPosition.y + delta.y,
    }

    if (checkCollision(state.board, state.currentPiece, nextPosition)) {
        return state
    }

    return {
        ...state,
        currentPosition: nextPosition,
    }
}

export function rotateCurrentPiece(state, options = {}) {
    if (!canRunGameTick(state)) {
        return state
    }

    const kickOffsets = options.kickOffsets ?? ROTATION_KICK_OFFSETS
    const rotatedPiece = rotatePiece(state.currentPiece)

    for (const offsetX of kickOffsets) {
        const kickedPosition = {
            ...state.currentPosition,
            x: state.currentPosition.x + offsetX,
        }

        if (!checkCollision(state.board, rotatedPiece, kickedPosition)) {
            return {
                ...state,
                currentPiece: rotatedPiece,
                currentPosition: kickedPosition,
            }
        }
    }

    return state
}

export function tickGame(state, options = {}) {
    if (!canRunGameTick(state)) {
        return state
    }

    const nextPosition = {
        x: state.currentPosition.x,
        y: state.currentPosition.y + 1,
    }

    if (!checkCollision(state.board, state.currentPiece, nextPosition)) {
        return {
            ...state,
            currentPosition: nextPosition,
        }
    }

    return lockCurrentPiece(state, options)
}

export function hardDrop(state, options = {}) {
    if (!canRunGameTick(state)) {
        return state
    }

    const finalPosition = {
        ...state.currentPosition,
        y: getDropPosition(state.board, state.currentPiece, state.currentPosition),
    }

    return lockCurrentPiece({
        ...state,
        currentPosition: finalPosition,
    }, options)
}

export function getGhostPosition(state) {
    return {
        x: state.currentPosition.x,
        y: getDropPosition(state.board, state.currentPiece, state.currentPosition),
    }
}

export function getRenderedBoard(state) {
    if (state.isGameOver || state.isClearing) {
        return state.board
    }

    const ghostPosition = getGhostPosition(state)
    const boardWithGhost = paintPieceOnBoard(state.board, state.currentPiece, ghostPosition, {
        value: {
            type: state.currentPiece.type,
            variant: 'ghost',
        },
        overwrite: false,
    })

    return paintPieceOnBoard(boardWithGhost, state.currentPiece, state.currentPosition)
}

export function withDerivedState(state) {
    return {
        ...state,
        isClearing: state.clearingRows.length > 0,
        speed: Math.max(100, 1000 - state.level * 100),
    }
}
