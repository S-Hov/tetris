import express from 'express'
import { handleTelegramWebhook } from '../controllers/telegramController.js'

const telegramRouter = express.Router()

telegramRouter.post('/webhook', handleTelegramWebhook)

export default telegramRouter   