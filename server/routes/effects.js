import express from 'express'
import { getGameEffects } from '../controllers/effectsController.js'

const effectsRouter = express.Router()

effectsRouter.get('/', getGameEffects)

export default effectsRouter
