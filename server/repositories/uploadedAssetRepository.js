import { pool } from '../db/index.js'

export const storeUploadedAssetRepo = async ({ url, contentType, buffer }) => {
    const normalizedUrl = normalizeUploadUrl(url)

    if (!normalizedUrl || !Buffer.isBuffer(buffer)) {
        return null
    }

    const result = await pool.query(
        `
        INSERT INTO uploaded_assets (url, content_type, size_bytes, data)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (url) DO UPDATE
        SET content_type = EXCLUDED.content_type,
            size_bytes = EXCLUDED.size_bytes,
            data = EXCLUDED.data,
            updated_at = NOW()
        RETURNING url, content_type, size_bytes, created_at, updated_at
        `,
        [normalizedUrl, contentType, buffer.length, buffer]
    )

    return result.rows[0] || null
}

export const getUploadedAssetByUrlRepo = async (url) => {
    const normalizedUrl = normalizeUploadUrl(url)

    if (!normalizedUrl) {
        return null
    }

    const result = await pool.query(
        `
        SELECT url, content_type, size_bytes, data, updated_at
        FROM uploaded_assets
        WHERE url = $1
        LIMIT 1
        `,
        [normalizedUrl]
    )

    return result.rows[0] || null
}

function normalizeUploadUrl(value) {
    const url = String(value || '').trim()

    if (!url.startsWith('/uploads/')) {
        return null
    }

    if (url.includes('\0') || url.includes('..')) {
        return null
    }

    return url.replace(/\/{2,}/g, '/')
}
