import { badRequest, notFound } from '../helpers/error.helper.js'
import {
    getUserCosmeticInventoryRepo,
    getAdminSkinPackCatalogRepo,
    getUserActiveSkinPackRepo,
    equipAdminSkinPackPreviewRepo,
    equipUserSkinPackRepo,
    grantCosmeticItemRepo,
    markUserCosmeticViewedRepo,
} from '../repositories/cosmeticsRepository.js'

const GRANT_SOURCES = new Set(['shop', 'achievement', 'admin_grant', 'event', 'promo', 'gift', 'system'])

export const getUserCosmeticInventoryService = async (userId) => {
    return await getUserCosmeticInventoryRepo(userId)
}

export const getAdminSkinPackCatalogService = async (userId) => {
    return await getAdminSkinPackCatalogRepo(userId)
}

export const getUserActiveSkinPackService = async (userId) => {
    return await getUserActiveSkinPackRepo(userId)
}

export const markUserCosmeticViewedService = async ({ inventoryItemId, userId }) => {
    const normalizedInventoryItemId = Number(inventoryItemId)

    if (!Number.isInteger(normalizedInventoryItemId) || normalizedInventoryItemId <= 0) {
        throw badRequest('COMMON.BAD_REQUEST')
    }

    const inventoryItem = await markUserCosmeticViewedRepo({
        inventoryItemId: normalizedInventoryItemId,
        userId,
    })

    if (!inventoryItem) {
        throw notFound('COMMON.NOT_FOUND')
    }

    return {
        inventoryId: inventoryItem.id,
        isNew: false,
    }
}

export const equipUserSkinPackService = async ({ inventoryItemId, userId }) => {
    const normalizedInventoryItemId = Number(inventoryItemId)

    if (!Number.isInteger(normalizedInventoryItemId) || normalizedInventoryItemId <= 0) {
        throw badRequest('COMMON.BAD_REQUEST')
    }

    const loadout = await equipUserSkinPackRepo({
        inventoryItemId: normalizedInventoryItemId,
        userId,
    })

    if (!loadout) {
        throw notFound('COMMON.NOT_FOUND')
    }

    return {
        inventoryItemId: loadout.inventoryItemId,
        isEquipped: true,
    }
}

export const equipAdminSkinPackPreviewService = async ({ cosmeticItemId, userId }) => {
    const normalizedCosmeticItemId = Number(cosmeticItemId)

    if (!Number.isInteger(normalizedCosmeticItemId) || normalizedCosmeticItemId <= 0) {
        throw badRequest('COMMON.BAD_REQUEST')
    }

    const loadout = await equipAdminSkinPackPreviewRepo({
        cosmeticItemId: normalizedCosmeticItemId,
        userId,
    })

    if (!loadout) {
        throw notFound('COMMON.NOT_FOUND')
    }

    return {
        cosmeticItemId: loadout.cosmetic_item_id,
        isAdminPreview: true,
        isEquipped: true,
    }
}

export const grantCosmeticItemService = async ({
    attributes = {},
    itemKey,
    source,
    sourceRef = null,
    userId,
}) => {
    if (!GRANT_SOURCES.has(source)) {
        throw badRequest('COMMON.BAD_REQUEST')
    }

    const inventoryItem = await grantCosmeticItemRepo({
        attributes,
        itemKey,
        source,
        sourceRef,
        userId,
    })

    if (!inventoryItem) {
        throw notFound('COMMON.NOT_FOUND')
    }

    return inventoryItem
}
