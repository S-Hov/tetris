import assert from 'node:assert/strict'
import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const serverRoot = path.resolve(path.dirname(__filename), '..')
const srcRoot = path.join(serverRoot, 'src')
const modulesRoot = path.join(srcRoot, 'modules')
const sharedRoot = path.join(srcRoot, 'shared')
const configRoot = path.join(srcRoot, 'config')
const LEGACY_AREAS = new Set([
    'config',
    'controllers',
    'db',
    'helpers',
    'middleware',
    'repositories',
    'routes',
    'services',
    'sockets',
    'utils',
])

const isInside = (parent, candidate) => {
    const relative = path.relative(parent, candidate)
    return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

const walkJavaScript = async (directory) => {
    try {
        const entries = await readdir(directory, { withFileTypes: true })
        const nested = await Promise.all(entries.map((entry) => {
            const entryPath = path.join(directory, entry.name)

            return entry.isDirectory()
                ? walkJavaScript(entryPath)
                : (entry.name.endsWith('.js') ? [entryPath] : [])
        }))

        return nested.flat()
    } catch (error) {
        if (error.code === 'ENOENT') {
            return []
        }

        throw error
    }
}

const collectRelativeImports = async (filePath) => {
    const source = await readFile(filePath, 'utf8')
    const imports = []
    const pattern = /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g
    let match

    while ((match = pattern.exec(source)) !== null) {
        if (match[1].startsWith('.')) {
            imports.push(path.resolve(path.dirname(filePath), match[1]))
        }
    }

    return imports
}

test('new modules cannot import legacy areas or another module internals', async () => {
    const files = await walkJavaScript(modulesRoot)
    const violations = []

    for (const filePath of files) {
        for (const target of await collectRelativeImports(filePath)) {
            const relativeToServer = path.relative(serverRoot, target)
            const [topLevel] = relativeToServer.split(path.sep)

            if (LEGACY_AREAS.has(topLevel)) {
                violations.push(`${path.relative(serverRoot, filePath)} -> ${relativeToServer}`)
                continue
            }

            if (target === path.join(sharedRoot, 'infrastructure', 'database', 'pool.js')) {
                violations.push(`${path.relative(serverRoot, filePath)} -> global pool`)
                continue
            }

            if (!isInside(modulesRoot, target)) {
                continue
            }

            const sourceModule = path.relative(modulesRoot, filePath).split(path.sep)[0]
            const targetParts = path.relative(modulesRoot, target).split(path.sep)

            if (targetParts[0] !== sourceModule && targetParts.slice(1).join('/') !== 'index.js') {
                violations.push(`${path.relative(serverRoot, filePath)} -> ${relativeToServer}`)
            }
        }
    }

    assert.deepEqual(violations, [])
})

test('shared foundation depends only on shared, config and external packages', async () => {
    const files = await walkJavaScript(sharedRoot)
    const violations = []

    for (const filePath of files) {
        for (const target of await collectRelativeImports(filePath)) {
            if (!isInside(sharedRoot, target) && !isInside(configRoot, target)) {
                violations.push(
                    `${path.relative(serverRoot, filePath)} -> ${path.relative(serverRoot, target)}`
                )
            }
        }
    }

    assert.deepEqual(violations, [])
})

test('generic shared dumping-ground filenames are forbidden', async () => {
    const files = await walkJavaScript(sharedRoot)
    const forbidden = files
        .filter((filePath) => ['common.js', 'helper.js', 'utils.js'].includes(path.basename(filePath)))
        .map((filePath) => path.relative(serverRoot, filePath))

    assert.deepEqual(forbidden, [])
})
