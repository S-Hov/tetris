import { useEffect } from 'react'

import { ensureSocketSession, socket } from '@/shared/api/socket'
import { resetFriendsState } from '@/shared/realtime/friendsRealtime'
import { COOKIE_CONSENT_ACCEPTED_EVENT } from '@/shared/lib/cookieConsent.js'
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

    useEffect(() => {
        if (isLoading || !isAuth || !user) {
            return undefined
        }

        const handleCookieConsentAccepted = () => {
            ensureSocketSession({ user }).catch(() => {
                resetFriendsState()
            })
        }

        window.addEventListener(COOKIE_CONSENT_ACCEPTED_EVENT, handleCookieConsentAccepted)

        return () => {
            window.removeEventListener(COOKIE_CONSENT_ACCEPTED_EVENT, handleCookieConsentAccepted)
        }
    }, [isAuth, isLoading, user])
}

export default useAppSocketSession
