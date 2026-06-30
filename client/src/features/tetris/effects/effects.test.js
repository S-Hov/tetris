import assert from 'node:assert/strict'
import test from 'node:test'

import { effectRegistry, getEffectImplementation } from './registry.js'
import {
    applyActionWithEffects,
    applyEffectModifiers,
    applyIncomingEffect,
    createDelayedActionFeedbackState,
    getEffectActionDelay,
    getEffectActionDelayState,
    getEffectPresentationState,
    hasPendingDelayedAction,
    removeExpiredEffects,
    runTimedEffects,
} from './runtime.js'

const createState = () => ({
    activeEffects: [],
    board: Array.from({ length: 20 }, () => Array(10).fill(null)),
    currentPiece: {
        shape: [[1]],
        type: 'I',
    },
    currentPosition: {
        x: 4,
        y: 10,
    },
    lockDelay: 900,
    speed: 900,
})

test('registry exposes all supported database effect keys', () => {
    assert.deepEqual(
        Object.keys(effectRegistry).sort(),
        [
            'controls_swap',
            'darkness',
            'delay_input',
            'fog_piece',
            'garbage_rain',
            'gravity_lock',
            'invisible_cells',
            'random_rotation',
            'screen_shake',
            'speed_x2_for_4s',
            'sticky_walls',
        ]
    )

    Object.values(effectRegistry).forEach((implementation) => {
        assert.equal(typeof implementation.effectKey, 'string')
        assert.equal(typeof implementation.normalizeParameters, 'function')
        assert.equal(typeof implementation.normalizeParameters({}), 'object')
    })
})

test('lifecycle replaces duplicate effects and removes expired effects', () => {
    const first = applyIncomingEffect(createState(), {
        effectKey: 'darkness',
        durationMs: 1000,
    }, { now: 100 })
    const replaced = applyIncomingEffect(first, {
        effectKey: 'darkness',
        durationMs: 2000,
    }, { now: 200 })

    assert.equal(replaced.activeEffects.length, 1)
    assert.equal(replaced.activeEffects[0].expiresAt, 2200)
    assert.equal(removeExpiredEffects(replaced, { now: 2199 }), replaced)
    assert.equal(removeExpiredEffects(replaced, { now: 2200 }).activeEffects.length, 0)
})

test('unknown effects are ignored safely', () => {
    const state = createState()
    const originalWarn = console.warn
    console.warn = () => {}

    try {
        assert.equal(applyIncomingEffect(state, {
            effectKey: 'not_implemented',
            durationMs: 1000,
        }), state)
    } finally {
        console.warn = originalWarn
    }
})

test('action pipeline swaps controls and exposes input delay', () => {
    let state = applyIncomingEffect(createState(), {
        effectKey: 'controls_swap',
        durationMs: 5000,
    }, { now: 100 })
    state = applyIncomingEffect(state, {
        effectKey: 'delay_input',
        durationMs: 5000,
        parameters: { inputDelayMs: 275 },
    }, { now: 100 })

    assert.equal(getEffectActionDelay(state, 'moveLeft'), 275)
    assert.deepEqual(getEffectActionDelayState(state, 'moveLeft'), {
        delayMs: 275,
        effectKey: 'delay_input',
        feedback: 'inputDelay',
    })
    const queuedState = createDelayedActionFeedbackState(
        state,
        getEffectActionDelayState(state, 'moveLeft'),
        'moveLeft',
        { now: 1000 }
    )

    assert.deepEqual(
        queuedState.effectFeedback,
        {
            action: 'moveLeft',
            delayMs: 275,
            effectKey: 'delay_input',
            executeAt: 1275,
            queuedAt: 1000,
            sequence: 1,
            type: 'inputDelay',
        }
    )
    assert.deepEqual(queuedState.pendingDelayedAction, {
        action: 'moveLeft',
        delayMs: 275,
        effectKey: 'delay_input',
        executeAt: 1275,
        id: 'delay_input-moveLeft-1000',
        queuedAt: 1000,
    })
    assert.equal(
        hasPendingDelayedAction(
            queuedState,
            getEffectActionDelayState(state, 'moveLeft'),
            'moveLeft',
            { now: 1100 }
        ),
        true
    )

    const nextState = applyActionWithEffects(
        state,
        'moveLeft',
        (preparedState, action) => ({
            ...preparedState,
            executedAction: action,
        }),
        { now: 200 }
    )

    assert.equal(nextState.executedAction, 'moveRight')
    assert.deepEqual(nextState.effectFeedback, {
        effectKey: 'controls_swap',
        occurredAt: 200,
        requestedAction: 'moveLeft',
        resolvedAction: 'moveRight',
        sequence: 1,
        type: 'controlsSwapped',
    })
})

test('gravity lock and sticky walls block movement through their own handlers', () => {
    let gravityState = createState()
    gravityState = applyIncomingEffect(gravityState, {
        effectKey: 'gravity_lock',
        durationMs: 5000,
    }, { now: 100 })

    const blockedGravityState = applyActionWithEffects(
        gravityState,
        'moveLeft',
        (preparedState) => ({ ...preparedState, moved: true }),
        { now: 200 }
    )

    assert.equal(blockedGravityState.moved, undefined)
    assert.deepEqual(blockedGravityState.effectFeedback, {
        effectKey: 'gravity_lock',
        occurredAt: 200,
        sequence: 1,
        type: 'gravityLockBlocked',
    })

    let stickyState = createState()
    stickyState.currentPosition.x = 0
    stickyState = applyIncomingEffect(stickyState, {
        effectKey: 'sticky_walls',
        durationMs: 5000,
    }, { now: 100 })

    const blockedStickyState = applyActionWithEffects(
        stickyState,
        'moveRight',
        (preparedState) => ({ ...preparedState, moved: true }),
        { now: 200 }
    )

    assert.equal(blockedStickyState.moved, undefined)
    assert.deepEqual(blockedStickyState.effectFeedback, {
        effectKey: 'sticky_walls',
        occurredAt: 200,
        sequence: 1,
        type: 'wallImpact',
    })
})

test('speed modifiers preserve gravity priority instead of multiplying effects', () => {
    let state = applyIncomingEffect(createState(), {
        effectKey: 'speed_x2_for_4s',
        durationMs: 5000,
        parameters: { speedMultiplier: 2 },
    }, { now: 100 })
    state = applyIncomingEffect(state, {
        effectKey: 'gravity_lock',
        durationMs: 5000,
        parameters: {
            lockDelayMultiplier: 0.5,
            speedMultiplier: 3,
        },
    }, { now: 100 })

    const derivedState = applyEffectModifiers(state)

    assert.equal(derivedState.speed, 300)
    assert.equal(derivedState.lockDelay, 450)
})

test('garbage rain uses database parameters and applies immediately', () => {
    const state = applyIncomingEffect(createState(), {
        effectKey: 'garbage_rain',
        durationMs: 1,
        parameters: {
            maxBlocks: 2,
            maxColumnRise: 3,
            minBlocks: 2,
            topSafeRows: 8,
        },
    }, {
        now: 100,
        random: () => 0,
    })
    const garbageCells = state.board.flatMap((row, y) => (
        row.map((cell, x) => ({ cell, x, y }))
    )).filter(({ cell }) => cell?.type === 'garbage')

    assert.equal(garbageCells.length, 2)
    assert.ok(garbageCells.every(({ y }) => y >= 17))
    assert.equal(state.activeEffects.some((effect) => effect.effectKey === 'garbage_rain'), false)
    assert.deepEqual(state.effectFeedback, {
        effectKey: 'garbage_rain',
        occurredAt: 100,
        placements: [
            { delayMs: 0, x: 0, y: 19 },
            { delayMs: 95, x: 0, y: 18 },
        ],
        sequence: 1,
        type: 'garbageDrop',
    })
})

test('timed and presentation effects are driven by implementations', () => {
    let state = applyIncomingEffect(createState(), {
        effectKey: 'random_rotation',
        durationMs: 5000,
        parameters: {
            chance: 1,
            intervalMs: 500,
        },
    }, { now: 100 })
    state = applyIncomingEffect(state, {
        effectKey: 'invisible_cells',
        durationMs: 5000,
        parameters: {
            hiddenModulo: 9,
            hiddenThreshold: 2,
        },
    }, { now: 100 })
    state = applyIncomingEffect(state, {
        effectKey: 'darkness',
        durationMs: 5000,
    }, { now: 100 })

    const rotated = runTimedEffects(state, {
        now: 600,
        random: () => 0,
        rotate: (currentState) => ({
            ...currentState,
            rotated: true,
        }),
    })
    const presentation = getEffectPresentationState(rotated)
    const invisibleCellsPresentation = getEffectImplementation('invisible_cells').presentation({
        parameters: {
            hiddenModulo: 11,
            hiddenThreshold: 3,
        },
    })

    assert.equal(rotated.rotated, true)
    assert.deepEqual(rotated.effectFeedback, {
        effectKey: 'random_rotation',
        occurredAt: 600,
        sequence: 1,
        type: 'rotationPulse',
    })
    assert.equal(presentation.boardEffect, 'signal-loss')
    assert.deepEqual(presentation.invisibleCells, {
        hiddenModulo: 9,
        hiddenThreshold: 2,
    })
    assert.equal(presentation.screenEffect, 'darkness-clouds')
    assert.equal(getEffectImplementation('controls_swap').presentation.boardEffect, 'controls-swap')
    assert.equal(getEffectImplementation('fog_piece').presentation.screenEffect, 'fog-piece')
    assert.equal(getEffectImplementation('fog_piece').presentation.fogPiece, true)
    assert.equal(getEffectImplementation('gravity_lock').presentation.boardEffect, 'gravity-lock')
    assert.equal(invisibleCellsPresentation.boardEffect, 'signal-loss')
    assert.equal(Boolean(invisibleCellsPresentation.audio.apply), true)
    assert.equal(getEffectImplementation('random_rotation').presentation.boardEffect, 'random-rotation')
    assert.equal(getEffectImplementation('screen_shake').presentation.boardEffect, 'screen-shake')
    assert.equal(Boolean(getEffectImplementation('screen_shake').presentation.audio.apply), true)
    assert.equal(getEffectImplementation('speed_x2_for_4s').presentation.boardEffect, 'speed-surge')
    assert.equal(Boolean(getEffectImplementation('speed_x2_for_4s').presentation.audio.apply), true)
    assert.equal(getEffectImplementation('random_rotation').effectKey, 'random_rotation')
})
