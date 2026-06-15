import { useEffect } from 'react'

import { ensureSocketSession, socket } from '@/shared/api/socket'
import { resetFriendsState } from '@/shared/realtime/friendsRealtime'
import { useAuth } from './useAuth'

const useAppSocketSession = () => {
    const { isAuth, isLoading, user } = useAuth()

    useEffect(() => {
        if (isLoading) {
            return undefined
        }

        if (!isAuth || !user) {
            if (socket.auth?.mode === 'authenticated') {
                socket.disconnect()
            }

            resetFriendsState()
            return undefined
        }

        let ignore = false

        ensureSocketSession({ user }).catch(() => {
            if (!ignore) {
                resetFriendsState()
            }
        })

        return () => {
            ignore = true
        }
    }, [isAuth, isLoading, user])
}

export default useAppSocketSession
