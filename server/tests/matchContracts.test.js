import assert from 'node:assert/strict'
import test from 'node:test'

import {
    aggregateMatchTeamStats,
    finishRoomMatchService,
    normalizeMatchPlayerStats,
} from '../services/matchService.js'
import { calculateMmrDelta, calculateRankDelta } from '../services/rankRules.js'

test('match persistence stats are normalized without trusting client values', () => {
    assert.deepEqual(normalizeMatchPlayerStats({
        gameState: {
            score: 1500.9,
            linesCleared: 12.8,
            level: 4.7,
        },
    }), {
        score: 1500,
        linesCleared: 12,
        levelReached: 4,
    })

    assert.deepEqual(normalizeMatchPlayerStats({
        gameState: { score: -50, linesCleared: -2, level: -1 },
    }), {
        score: 0,
        linesCleared: 0,
        levelReached: 1,
    })
})

test('game-over payload overrides the last player snapshot for persistence', () => {
    assert.deepEqual(normalizeMatchPlayerStats({
        gameState: { score: 10, linesCleared: 1, level: 1 },
    }, {
        score: 900,
        linesCleared: 9,
        level: 3,
    }), {
        score: 900,
        linesCleared: 9,
        levelReached: 3,
    })
})

test('team match stats sum score and lines and preserve the highest level', () => {
    assert.deepEqual(aggregateMatchTeamStats([
        { gameState: { score: 1200, linesCleared: 10, level: 3 } },
        { gameState: { score: 800, linesCleared: 7, level: 5 } },
    ]), {
        score: 2000,
        linesCleared: 17,
        levelReached: 5,
    })
})

test('an incomplete room result is ignored before repository persistence', async () => {
    assert.equal(await finishRoomMatchService({ roomId: 'room-1' }), null)
})

test('ranked result formulas preserve the current win, loss and MMR contract', () => {
    assert.equal(calculateRankDelta({ result: 'win' }), 25)
    assert.equal(calculateRankDelta({ result: 'win', score: 10000, linesCleared: 50, scoreDiff: 2000 }), 40)
    assert.equal(calculateRankDelta({ result: 'lose' }), -15)
    assert.equal(calculateRankDelta({ result: 'loss', score: 10000, linesCleared: 50 }), -8)
    assert.equal(calculateRankDelta({ result: 'draw' }), 0)
    assert.equal(calculateMmrDelta('win'), 20)
    assert.equal(calculateMmrDelta('lose'), -20)
    assert.equal(calculateMmrDelta('draw'), 0)
})
