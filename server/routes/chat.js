import express from 'express'

import {
    createDirectConversation,
    getChatConversations,
    getConversationMessages,
    markConversationRead,
} from '../controllers/chatController.js'
import { checkAuth } from '../src/modules/identity/index.js'

const chatRouter = express.Router()

chatRouter.use(checkAuth)

chatRouter.get('/conversations', getChatConversations)
chatRouter.post('/conversations/direct', createDirectConversation)
chatRouter.get('/conversations/:conversationId/messages', getConversationMessages)
chatRouter.patch('/conversations/:conversationId/read', markConversationRead)

export default chatRouter
