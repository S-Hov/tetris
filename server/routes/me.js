import express from 'express'

import {
    getMyCosmeticInventory,
    markMyCosmeticViewed,
} from '../controllers/cosmeticsController.js'
import { checkAuth } from '../middleware/checkAuth.js'

const meRouter = express.Router()

meRouter.get('/inventory/cosmetics', checkAuth, getMyCosmeticInventory)
meRouter.patch('/inventory/cosmetics/:inventoryItemId/viewed', checkAuth, markMyCosmeticViewed)

export default meRouter
