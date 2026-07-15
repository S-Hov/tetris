import {
    getUserCosmeticInventoryService,
    markUserCosmeticViewedService,
} from '../services/cosmeticsService.js'
import { ok } from '../src/shared/responses/send.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const getMyCosmeticInventory = asyncHandler(async (req, res) => {
    const items = await getUserCosmeticInventoryService(req.user.id)

    return ok(res, req, 'COMMON.OK', {
        data: { items },
    })
})

export const markMyCosmeticViewed = asyncHandler(async (req, res) => {
    const inventoryItem = await markUserCosmeticViewedService({
        inventoryItemId: req.params.inventoryItemId,
        userId: req.user.id,
    })

    return ok(res, req, 'COMMON.OK', {
        data: { inventoryItem },
    })
})
