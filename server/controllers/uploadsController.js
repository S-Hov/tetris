import { asyncHandler } from '../utils/asyncHandler.js'
import { getUploadedAssetByUrlRepo } from '../repositories/uploadedAssetRepository.js'

export const serveUploadedAsset = asyncHandler(async (req, res) => {
    const asset = await getUploadedAssetByUrlRepo(req.path)

    if (!asset) {
        res.status(404).json({
            success: false,
            message: 'Uploaded file not found',
            data: null,
        })
        return
    }

    const updatedAt = asset.updated_at ? new Date(asset.updated_at) : new Date()

    res.setHeader('Content-Type', asset.content_type)
    res.setHeader('Content-Length', asset.size_bytes)
    res.setHeader('Cache-Control', 'public, max-age=604800')
    res.setHeader('Last-Modified', updatedAt.toUTCString())
    res.send(asset.data)
})
