import express from 'express'

import {
    createFriendRequest,
    findFriendCandidate,
    getFriends,
    getIncomingRequests,
    respondFriendRequest,
} from '../controllers/friendsController.js'
import { checkAuth } from '../middleware/checkAuth.js'

const friendsRouter = express.Router()

friendsRouter.use(checkAuth)

friendsRouter.get('/', getFriends)
friendsRouter.get('/requests/incoming', getIncomingRequests)
friendsRouter.get('/search/:userId', findFriendCandidate)
friendsRouter.post('/requests', createFriendRequest)
friendsRouter.patch('/requests/:requestId', respondFriendRequest)

export default friendsRouter
