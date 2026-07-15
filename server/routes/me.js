import express from 'express'

import {
    getMyCosmeticInventory,
    getMyCosmeticLoadout,
    equipMySkinPack,
    markMyCosmeticViewed,
} from '../controllers/cosmeticsController.js'
import { checkAuth } from '../middleware/checkAuth.js'

const meRouter = express.Router()

meRouter.get('/inventory/cosmetics', checkAuth, getMyCosmeticInventory)
meRouter.patch('/inventory/cosmetics/:inventoryItemId/viewed', checkAuth, markMyCosmeticViewed)
meRouter.get('/cosmetics/loadout', checkAuth, getMyCosmeticLoadout)
meRouter.put('/cosmetics/loadout', checkAuth, equipMySkinPack)

export default meRouter
