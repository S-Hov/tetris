import express from 'express'

import {
    getMyCosmeticInventory,
    getMyAdminSkinPackCatalog,
    getMyCosmeticLoadout,
    equipMyAdminSkinPackPreview,
    equipMySkinPack,
    markMyCosmeticViewed,
} from '../controllers/cosmeticsController.js'
import { checkAuth } from '../middleware/checkAuth.js'
import { checkAdmin } from '../middleware/checkAdmin.js'

const meRouter = express.Router()

meRouter.get('/inventory/cosmetics', checkAuth, getMyCosmeticInventory)
meRouter.patch('/inventory/cosmetics/:inventoryItemId/viewed', checkAuth, markMyCosmeticViewed)
meRouter.get('/cosmetics/catalog', checkAuth, checkAdmin, getMyAdminSkinPackCatalog)
meRouter.get('/cosmetics/loadout', checkAuth, getMyCosmeticLoadout)
meRouter.put('/cosmetics/admin-preview', checkAuth, checkAdmin, equipMyAdminSkinPackPreview)
meRouter.put('/cosmetics/loadout', checkAuth, equipMySkinPack)

export default meRouter
