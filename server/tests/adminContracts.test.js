import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

import { collectRestInventory } from '../scripts/lib/architectureInventory.js'

const __filename = fileURLToPath(import.meta.url)
const serverRoot = path.resolve(path.dirname(__filename), '..')

test('all admin routes retain the shared authentication and authorization guard', async () => {
    const source = await readFile(path.join(serverRoot, 'routes', 'admin.js'), 'utf8')

    assert.match(source, /adminRouter\.use\(checkAuth, checkAdmin\)/)
})

test('admin cosmetic catalog and preview remain protected by both guards', async () => {
    const source = await readFile(path.join(serverRoot, 'routes', 'me.js'), 'utf8')

    assert.match(
        source,
        /meRouter\.get\('\/cosmetics\/catalog', checkAuth, checkAdmin, getMyAdminSkinPackCatalog\)/
    )
    assert.match(
        source,
        /meRouter\.put\('\/cosmetics\/admin-preview', checkAuth, checkAdmin, equipMyAdminSkinPackPreview\)/
    )
})

test('critical admin control endpoints remain registered under /api/admin', async () => {
    const endpoints = await collectRestInventory(serverRoot)
    const adminContracts = new Set(
        endpoints
            .filter(({ source }) => source === 'routes/admin.js')
            .map(({ method, path: routePath }) => `${method} ${routePath}`)
    )

    for (const contract of [
        'GET /api/admin/me',
        'GET /api/admin/dashboard',
        'GET /api/admin/database/schema',
        'POST /api/admin/database/backups',
        'POST /api/admin/database/backups/:fileName/restore',
        'POST /api/admin/migrations/run',
        'PATCH /api/admin/users/:userId/manage',
        'POST /api/admin/support/requests/:requestId/reply',
    ]) {
        assert.ok(adminContracts.has(contract), `Missing admin contract: ${contract}`)
    }

    assert.equal(adminContracts.size, 51)
})

test('admin responses retain their legacy success-message-data envelope during migration', async () => {
    const source = await readFile(path.join(serverRoot, 'controllers', 'adminController.js'), 'utf8')

    assert.match(source, /const sendAdminResponse = \(res, message, data\) => \{\s*res\.json\(\{\s*success: true,\s*message,\s*data,/s)
})
