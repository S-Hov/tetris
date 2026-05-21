import { promises as fs } from 'fs'
import path from 'path'
import { storeUploadedAssetRepo } from '../repositories/uploadedAssetRepository.js'

const CONTENT_TYPES_BY_EXTENSION = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.svg': 'image/svg+xml',
    '.webm': 'video/webm',
}

export const syncLocalUploadsToDatabase = async (uploadsRoot) => {
    const root = path.resolve(uploadsRoot)
    const files = await listUploadFiles(root)
    let synced = 0

    for (const filePath of files) {
        const contentType = CONTENT_TYPES_BY_EXTENSION[path.extname(filePath).toLowerCase()]

        if (!contentType) {
            continue
        }

        const relativePath = path.relative(root, filePath).split(path.sep).join('/')
        const url = `/uploads/${relativePath}`
        const buffer = await fs.readFile(filePath)

        await storeUploadedAssetRepo({
            url,
            contentType,
            buffer,
        })
        synced += 1
    }

    return { synced, total: files.length }
}

async function listUploadFiles(root) {
    let entries

    try {
        entries = await fs.readdir(root, { withFileTypes: true })
    } catch (error) {
        if (error.code === 'ENOENT') {
            return []
        }

        throw error
    }

    const files = []

    for (const entry of entries) {
        const entryPath = path.join(root, entry.name)

        if (entry.isDirectory()) {
            files.push(...await listUploadFiles(entryPath))
        } else if (entry.isFile() && entry.name !== '.gitkeep') {
            files.push(entryPath)
        }
    }

    return files
}
