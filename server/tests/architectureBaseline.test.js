import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { collectArchitectureInventory } from '../scripts/lib/architectureInventory.js'

const __filename = fileURLToPath(import.meta.url)
const serverRoot = path.resolve(path.dirname(__filename), '..')
const baselinePath = path.join(serverRoot, 'tests', 'contracts', 'baseline', 'architecture.json')

test('REST, Socket.IO, database and import contracts match the reviewed architecture baseline', async () => {
    const expected = JSON.parse(await readFile(baselinePath, 'utf8'))
    const actual = await collectArchitectureInventory(serverRoot)

    assert.deepEqual(actual, expected)
    assert.equal(actual.rest.length, 109)
    assert.equal(actual.sockets.filter((event) => event.direction === 'incoming').length, 31)
    assert.equal(actual.sockets.filter((event) => event.direction === 'outgoing').length, 33)
    assert.equal(actual.tables.length, 41)
})

test('critical public contracts are present in the architecture baseline', async () => {
    const inventory = await collectArchitectureInventory(serverRoot)
    const restContracts = new Set(inventory.rest.map(({ method, path: routePath }) => `${method} ${routePath}`))
    const socketContracts = new Set(inventory.sockets.map(({ direction, event }) => `${direction} ${event}`))

    for (const contract of [
        'POST /api/identity/register',
        'POST /api/identity/login',
        'GET /api/identity/me',
        'GET /api/matches',
        'GET /api/me/inventory/cosmetics',
        'GET /api/me/cosmetics/loadout',
        'GET /api/me/cosmetics/catalog',
        'PATCH /api/me/inventory/cosmetics/:inventoryItemId/viewed',
        'PUT /api/me/cosmetics/loadout',
        'PUT /api/me/cosmetics/admin-preview',
        'POST /api/matches/solo/results',
        'GET /api/analytics/public-stats',
        'GET /api/admin/dashboard',
        'POST /api/admin/migrations/run',
    ]) {
        assert.ok(restContracts.has(contract), `Missing REST contract: ${contract}`)
    }

    for (const contract of [
        'incoming game:over',
        'incoming ability:use',
        'incoming room:create',
        'incoming matchmaking:join',
        'outgoing match:end',
        'outgoing room:state',
        'outgoing effect:apply',
    ]) {
        assert.ok(socketContracts.has(contract), `Missing Socket.IO contract: ${contract}`)
    }
})
