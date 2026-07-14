import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete'])
const SOCKET_SERVICE_FILES = new Set([
    'services/activityFeedService.js',
    'services/chatRealtimeService.js',
    'services/friendsRealtimeService.js',
    'services/supportRealtimeService.js',
])

const toPosix = (value) => value.split(path.sep).join('/')

const walkFiles = async (directory, predicate) => {
    const entries = await readdir(directory, { withFileTypes: true })
    const files = []

    for (const entry of entries) {
        if (['node_modules', 'backups', 'uploads'].includes(entry.name)) {
            continue
        }

        const entryPath = path.join(directory, entry.name)

        if (entry.isDirectory()) {
            files.push(...await walkFiles(entryPath, predicate))
        } else if (predicate(entryPath)) {
            files.push(entryPath)
        }
    }

    return files.sort((left, right) => left.localeCompare(right))
}

const readSources = async (serverRoot, files) => Promise.all(files.map(async (filePath) => ({
    filePath,
    source: await readFile(filePath, 'utf8'),
    relativePath: toPosix(path.relative(serverRoot, filePath)),
})))

const joinRoutePath = (mountPath, routePath) => {
    const joined = `${mountPath.replace(/\/$/, '')}/${routePath.replace(/^\//, '')}`

    return joined === '' ? '/' : joined.replace(/\/$/, '') || '/'
}

export const collectRestInventory = async (serverRoot) => {
    const serverSource = await readFile(path.join(serverRoot, 'server.js'), 'utf8')
    const routerImports = new Map()
    const importPattern = /import\s+(\w+)\s+from\s+['"]\.\/routes\/([^'"]+)['"]/g
    const mountPattern = /app\.use\s*\(\s*(['"])(\/api\/[^'"]+)\1\s*,\s*(\w+)/g
    let match

    while ((match = importPattern.exec(serverSource)) !== null) {
        routerImports.set(match[1], `routes/${match[2]}`)
    }

    const mountsByFile = new Map()

    while ((match = mountPattern.exec(serverSource)) !== null) {
        const routeFile = routerImports.get(match[3])

        if (routeFile) {
            mountsByFile.set(routeFile, match[2])
        }
    }

    const routeFiles = await walkFiles(
        path.join(serverRoot, 'routes'),
        (filePath) => filePath.endsWith('.js')
    )
    const sources = await readSources(serverRoot, routeFiles)
    const endpoints = []

    for (const { relativePath, source } of sources) {
        const mountPath = mountsByFile.get(relativePath) || null
        const routePattern = /\b\w+Router\.(get|post|put|patch|delete)\s*\(\s*(['"])([^'"]+)\2/g

        while ((match = routePattern.exec(source)) !== null) {
            const method = match[1].toLowerCase()

            if (!HTTP_METHODS.has(method)) {
                continue
            }

            endpoints.push({
                method: method.toUpperCase(),
                path: mountPath ? joinRoutePath(mountPath, match[3]) : match[3],
                routePath: match[3],
                mountPath,
                source: relativePath,
            })
        }
    }

    return endpoints.sort((left, right) => (
        left.path.localeCompare(right.path) || left.method.localeCompare(right.method)
    ))
}

export const collectSocketInventory = async (serverRoot) => {
    const socketFiles = await walkFiles(
        path.join(serverRoot, 'sockets'),
        (filePath) => filePath.endsWith('.js')
    )
    const serviceFiles = [...SOCKET_SERVICE_FILES]
        .map((relativePath) => path.join(serverRoot, ...relativePath.split('/')))
    const sources = await readSources(serverRoot, [...socketFiles, ...serviceFiles])
    const events = []
    let match

    for (const { relativePath, source } of sources) {
        const listenerPattern = /\.on\s*\(\s*(['"])([^'"]+)\1/g
        const emitPattern = /\.emit\s*\(\s*(['"])([^'"]+)\1/g

        while ((match = listenerPattern.exec(source)) !== null) {
            events.push({ direction: 'incoming', event: match[2], source: relativePath })
        }

        while ((match = emitPattern.exec(source)) !== null) {
            events.push({ direction: 'outgoing', event: match[2], source: relativePath })
        }
    }

    const uniqueEvents = [...new Map(events.map((event) => [
        `${event.direction}:${event.event}:${event.source}`,
        event,
    ])).values()]

    return uniqueEvents.sort((left, right) => (
        left.event.localeCompare(right.event) ||
        left.direction.localeCompare(right.direction) ||
        left.source.localeCompare(right.source)
    ))
}

export const collectTableInventory = async (serverRoot) => {
    const migrationFiles = await walkFiles(
        path.join(serverRoot, 'migrations'),
        (filePath) => filePath.endsWith('.sql')
    )
    const sources = await readSources(serverRoot, migrationFiles)
    const tables = new Map()
    let match

    for (const { relativePath, source } of sources) {
        const tablePattern = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi

        while ((match = tablePattern.exec(source)) !== null) {
            if (!tables.has(match[1])) {
                tables.set(match[1], {
                    table: match[1],
                    introducedBy: relativePath,
                })
            }
        }
    }

    return [...tables.values()].sort((left, right) => left.table.localeCompare(right.table))
}

const classifyLegacyArea = (relativePath) => {
    const [area, second] = relativePath.split('/')

    if (area === 'src' && second === 'shared') {
        return 'shared'
    }

    return area
}

export const collectImportInventory = async (serverRoot) => {
    const jsFiles = (await walkFiles(serverRoot, (filePath) => filePath.endsWith('.js')))
        .filter((filePath) => {
            const relativePath = toPosix(path.relative(serverRoot, filePath))

            return !relativePath.startsWith('scripts/') && !relativePath.startsWith('tests/')
        })
    const sources = await readSources(serverRoot, jsFiles)
    const edges = []
    let match

    for (const { filePath, relativePath, source } of sources) {
        const importPattern = /(?:import|export)\s+(?:[^'";]+?\s+from\s+)?['"]([^'"]+)['"]/g

        while ((match = importPattern.exec(source)) !== null) {
            if (!match[1].startsWith('.')) {
                continue
            }

            const resolvedPath = path.resolve(path.dirname(filePath), match[1])
            const targetPath = toPosix(path.relative(serverRoot, resolvedPath))

            edges.push({
                from: relativePath,
                fromArea: classifyLegacyArea(relativePath),
                to: targetPath,
                toArea: classifyLegacyArea(targetPath),
            })
        }
    }

    return edges.sort((left, right) => (
        left.from.localeCompare(right.from) || left.to.localeCompare(right.to)
    ))
}

export const collectArchitectureInventory = async (serverRoot) => ({
    rest: await collectRestInventory(serverRoot),
    sockets: await collectSocketInventory(serverRoot),
    tables: await collectTableInventory(serverRoot),
    imports: await collectImportInventory(serverRoot),
})
