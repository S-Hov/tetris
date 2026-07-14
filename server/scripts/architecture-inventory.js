import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

import { collectArchitectureInventory } from './lib/architectureInventory.js'

const __filename = fileURLToPath(import.meta.url)
const serverRoot = path.resolve(path.dirname(__filename), '..')
const inventory = await collectArchitectureInventory(serverRoot)
const baselinePath = path.join(serverRoot, 'tests', 'contracts', 'baseline', 'architecture.json')

const summarize = (currentInventory) => {
    const countBy = (items, getKey) => Object.fromEntries(
        Object.entries(items.reduce((summary, item) => {
            const key = getKey(item)
            summary[key] = (summary[key] || 0) + 1
            return summary
        }, {})).sort(([left], [right]) => left.localeCompare(right))
    )
    const importsByArea = Object.entries(currentInventory.imports.reduce((summary, edge) => {
        const key = `${edge.fromArea} -> ${edge.toArea}`
        summary[key] = (summary[key] || 0) + 1
        return summary
    }, {})).sort(([left], [right]) => left.localeCompare(right))

    return {
        restEndpoints: currentInventory.rest.length,
        socketContracts: currentInventory.sockets.length,
        incomingSocketEvents: currentInventory.sockets.filter((event) => event.direction === 'incoming').length,
        outgoingSocketEvents: currentInventory.sockets.filter((event) => event.direction === 'outgoing').length,
        databaseTables: currentInventory.tables.length,
        relativeImports: currentInventory.imports.length,
        restBySource: countBy(currentInventory.rest, (endpoint) => endpoint.source),
        socketsBySource: countBy(currentInventory.sockets, (event) => event.source),
        importsByArea: Object.fromEntries(importsByArea),
    }
}

if (process.argv.includes('--write')) {
    await mkdir(path.dirname(baselinePath), { recursive: true })
    await writeFile(baselinePath, `${JSON.stringify(inventory, null, 2)}\n`, 'utf8')
    process.stdout.write(`Architecture baseline updated: ${baselinePath}\n`)
} else if (process.argv.includes('--check')) {
    const baseline = JSON.parse(await readFile(baselinePath, 'utf8'))

    assert.deepEqual(inventory, baseline)
    process.stdout.write('Architecture baseline matches the current server contracts.\n')
} else if (process.argv.includes('--summary')) {
    process.stdout.write(`${JSON.stringify(summarize(inventory), null, 2)}\n`)
} else {
    process.stdout.write(`${JSON.stringify(inventory, null, 2)}\n`)
}
