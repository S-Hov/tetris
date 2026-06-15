import { useEffect, useState } from 'react'

import {
    bindFriendsRealtime,
    getFriendsState,
    requestFriendsState,
    subscribeFriendsState,
} from '@/shared/realtime/friendsRealtime'
import { socket } from '@/shared/api/socket'

const useFriendsRealtime = ({ enabled = true } = {}) => {
    const [state, setState] = useState(() => getFriendsState())

    useEffect(() => {
        bindFriendsRealtime()

        return subscribeFriendsState(setState)
    }, [])

    useEffect(() => {
        if (!enabled) {
            return undefined
        }

        requestFriendsState()

        const handleConnect = () => requestFriendsState()

        socket.on('connect', handleConnect)

        return () => {
            socket.off('connect', handleConnect)
        }
    }, [enabled])

    return {
        ...state,
        refresh: requestFriendsState,
    }
}

export default useFriendsRealtime
