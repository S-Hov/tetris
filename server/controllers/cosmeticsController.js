import {
    getUserCosmeticInventoryService,
    getUserActiveSkinPackService,
    equipUserSkinPackService,
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

export const getMyCosmeticLoadout = asyncHandler(async (req, res) => {
    const loadout = await getUserActiveSkinPackService(req.user.id)

    return ok(res, req, 'COMMON.OK', {
        data: { loadout },
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

export const equipMySkinPack = asyncHandler(async (req, res) => {
    const loadout = await equipUserSkinPackService({
        inventoryItemId: req.body?.inventoryItemId,
        userId: req.user.id,
    })

    return ok(res, req, 'COMMON.OK', {
        data: { loadout },
    })
})
