import express from 'express'

import { getMyCosmeticInventory } from '../controllers/cosmeticsController.js'
import { checkAuth } from '../middleware/checkAuth.js'

const meRouter = express.Router()

meRouter.get('/inventory/cosmetics', checkAuth, getMyCosmeticInventory)

export default meRouter
