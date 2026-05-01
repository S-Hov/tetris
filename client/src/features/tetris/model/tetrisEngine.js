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
import { hasEffect, EFFECT_TYPES } from './effects.js'

export const LINE_CLEAR_ANIMATION_MS = 250
export const ROTATION_KICK_OFFSETS = [0, -1, 1, -2, 2]
const GARBAGE_RAIN_MIN_BLOCKS = 6
const GARBAGE_RAIN_MAX_BLOCKS = 10
const GARBAGE_RAIN_TOP_SAFE_ROWS = 8

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

function getPieceCells(piece, position) {
    const cells = []

    piece.shape.forEach((row, y) => {
        row.forEach((cell, x) => {
            if (!cell) return

            cells.push({
                x: position.x + x,
                y: position.y + y,
            })
        })
    })

    return cells
}

function isCurrentPieceCell(state, x, y) {
    return getPieceCells(state.currentPiece, state.currentPosition).some(
        (cell) => cell.x === x && cell.y === y
    )
}

function touchesHorizontalWall(state) {
    const boardWidth = state.board[0]?.length ?? 0

    return getPieceCells(state.currentPiece, state.currentPosition).some(
        (cell) => cell.x <= 0 || cell.x >= boardWidth - 1
    )
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
        currentPiece: {
            ...currentPiece,
            isLockedPhase: false,
        },
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
    const abilitiesEnabled = options.abilitiesEnabled ?? true

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
        abilitiesEnabled,
        isChoosingAbility: false,
        abilityOptions: [],
        abilityChoiceEndsAt: null,
        activeEffects: [],
    }
}

export function restartGame(options = {}) {
    return createGameState(options)
}

export function resolveLineClear(state, options = {}) {
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

    if (nextState.abilitiesEnabled && nextState.energy >= 100) {
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
        state.pendingClear.currentPosition,
        options
    )
}

export function resolveAbilityChoice(state, selectedAbility = null, options = {}) {
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
        state.pendingClear.currentPosition,
        options
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

    const isHorizontalMove = delta.x !== 0 && delta.y === 0

    if (
        isHorizontalMove &&
        (
            (hasEffect(state, EFFECT_TYPES.GRAVITY_LOCK) && state.currentPiece.isLockedPhase) ||
            (hasEffect(state, EFFECT_TYPES.STICKY_WALLS) && touchesHorizontalWall(state))
        )
    ) {
        return state
    }

    const normalizedDelta = {
        ...delta,
        x: hasEffect(state, EFFECT_TYPES.CONTROLS_SWAP) ? -delta.x : delta.x,
    }

    const nextPosition = {
        x: state.currentPosition.x + normalizedDelta.x,
        y: state.currentPosition.y + normalizedDelta.y,
    }

    if (checkCollision(state.board, state.currentPiece, nextPosition)) {
        return state
    }

    return {
        ...state,
        currentPiece: normalizedDelta.y > 0 && hasEffect(state, EFFECT_TYPES.GRAVITY_LOCK)
            ? {
                ...state.currentPiece,
                isLockedPhase: true,
            }
            : state.currentPiece,
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
            currentPiece: hasEffect(state, EFFECT_TYPES.GRAVITY_LOCK)
                ? {
                    ...state.currentPiece,
                    isLockedPhase: true,
                }
                : state.currentPiece,
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

export function applyGarbageRain(state, random = Math.random) {
    const board = state.board.map((row) => [...row])
    const targetBlocks = GARBAGE_RAIN_MIN_BLOCKS + Math.floor(
        random() * (GARBAGE_RAIN_MAX_BLOCKS - GARBAGE_RAIN_MIN_BLOCKS + 1)
    )
    const candidates = []

    board.forEach((row, y) => {
        if (y < GARBAGE_RAIN_TOP_SAFE_ROWS) return

        const emptyCellsInRow = row.filter((cell) => !cell).length

        if (emptyCellsInRow <= 1) return

        row.forEach((cell, x) => {
            if (cell || isCurrentPieceCell(state, x, y)) return

            candidates.push({ x, y })
        })
    })

    const shuffledCandidates = candidates.sort(() => random() - 0.5)
    let placedBlocks = 0

    for (const candidate of shuffledCandidates) {
        if (placedBlocks >= targetBlocks) break

        const row = board[candidate.y]
        const emptyCellsInRow = row.filter((cell) => !cell).length

        if (emptyCellsInRow <= 1) continue

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
}

export function applyIncomingEffect(state, effect) {
    if (!effect?.type) {
        return state
    }

    const now = Date.now()
    const durationMs = Number(effect.durationMs) || 4000
    const expiresAt = now + durationMs
    const withEffect = {
        ...state,
        activeEffects: [
            ...state.activeEffects.filter((item) => item.expiresAt > now && item.type !== effect.type),
            {
                type: effect.type,
                expiresAt,
            },
        ],
    }

    if (effect.type === EFFECT_TYPES.GARBAGE_RAIN) {
        return applyGarbageRain(withEffect)
    }

    return withEffect
}

export function shiftBoard(state, direction) {
    if (!canRunGameTick(state)) {
        return state
    }

    const offset = direction < 0 ? -1 : 1
    const board = state.board.map((row) => {
        if (offset < 0) {
            return [...row.slice(1), 0]
        }

        return [0, ...row.slice(0, -1)]
    })

    if (checkCollision(board, state.currentPiece, state.currentPosition)) {
        return state
    }

    return {
        ...state,
        board,
    }
}

export function withDerivedState(state) {
    const baseSpeed = Math.max(100, 1000 - state.level * 100)

    const speedMultiplier = hasEffect(state, EFFECT_TYPES.GRAVITY_LOCK)
        ? 3
        : hasEffect(state, EFFECT_TYPES.SPEED_X2)
            ? 2
            : 1

    const speed = speedMultiplier > 1
        ? Math.max(50, Math.floor(baseSpeed / speedMultiplier))
        : baseSpeed

    const lockDelay = hasEffect(state, EFFECT_TYPES.GRAVITY_LOCK)
        ? Math.max(50, Math.floor(baseSpeed / 2))
        : baseSpeed
    
    return {
        ...state,
        isClearing: state.clearingRows.length > 0,
        lockDelay,
        speed,
    }
}
