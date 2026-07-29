import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const clientRoot = path.resolve(path.dirname(__filename), '..', '..', '..')
const projectRoot = path.resolve(clientRoot, '..')

test('public and admin clients use the identity namespace with the stable OAuth callback exception', async () => {
    const files = await Promise.all([
        readFile(path.join(clientRoot, 'src', 'shared', 'api', 'auth', 'index.js'), 'utf8'),
        readFile(path.join(clientRoot, 'src', 'shared', 'api', 'settings', 'index.js'), 'utf8'),
        readFile(path.join(clientRoot, 'src', 'features', 'AuthForm', 'AuthForm.jsx'), 'utf8'),
        readFile(path.join(projectRoot, 'admin', 'src', 'shared', 'api', 'auth', 'index.js'), 'utf8'),
    ])
    const source = files.join('\n')

    assert.doesNotMatch(source, /\/api\/authentication/)
    assert.doesNotMatch(source, /\/api\/settings\/(?:connections|account)/)
    assert.match(source, /\/api\/identity\/register/)
    assert.match(source, /\/api\/identity\/oauth\/\$\{item\.provider\}/)
    assert.match(source, /\/api\/identity\/connections/)
})
