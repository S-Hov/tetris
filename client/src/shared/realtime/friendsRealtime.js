import { socket } from '@/shared/api/socket'

const initialState = {
    friends: [],
    requests: [],
    requestsCount: 0,
    status: 'idle',
    userId: null,
    error: null,
}

let friendsState = initialState
let isBound = false
const listeners = new Set()

const notifyListeners = () => {
    listeners.forEach((listener) => listener(friendsState))
}

const setFriendsState = (nextState) => {
    friendsState = {
        ...friendsState,
        ...nextState,
    }
    notifyListeners()
}

const handleFriendsState = (payload = {}) => {
    setFriendsState({
        friends: Array.isArray(payload.friends) ? payload.friends : [],
        requests: Array.isArray(payload.requests) ? payload.requests : [],
        requestsCount: Number.isInteger(payload.requestsCount)
            ? payload.requestsCount
            : Array.isArray(payload.requests)
                ? payload.requests.length
                : 0,
        status: 'success',
        userId: payload.userId || null,
        error: null,
    })
}

const handlePresenceUpdate = ({ userId, isOnline } = {}) => {
    if (!userId) {
        return
    }

    setFriendsState({
        friends: friendsState.friends.map((friend) => (
            friend.id === userId ? { ...friend, isOnline: Boolean(isOnline) } : friend
        )),
    })
}

export const bindFriendsRealtime = () => {
    if (isBound) {
        return
    }

    socket.on('friends:state', handleFriendsState)
    socket.on('presence:update', handlePresenceUpdate)
    isBound = true
}

export const subscribeFriendsState = (listener) => {
    listeners.add(listener)

    return () => {
        listeners.delete(listener)
    }
}

export const getFriendsState = () => friendsState

export const resetFriendsState = () => {
    friendsState = initialState
    notifyListeners()
}

export const requestFriendsState = () => {
    bindFriendsRealtime()

    if (!socket.connected) {
        setFriendsState({ status: 'idle' })
        return
    }

    setFriendsState({ status: friendsState.status === 'success' ? 'refreshing' : 'loading', error: null })

    socket.emit('friends:state:get', {}, (response = {}) => {
        if (response.success && response.state) {
            handleFriendsState(response.state)
            return
        }

        setFriendsState({
            status: 'error',
            error: response.message || 'Could not load friends state',
        })
    })
}
