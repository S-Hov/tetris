import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { DEFAULT_LANGUAGE, getLanguageFromPathname, getLocalizedGamePath } from '@/i18n'
import { friendsAPI } from '@/shared/api/friends'
import { chatAPI } from '@/shared/api/chat'
import { socket } from '@/shared/api/socket'
import { usersAPI } from '@/shared/api/users'
import notify from '@/utils/Notifications'
import UserActionsMenu from '@/widgets/UserActionsMenu'
import UserActionsContext from './userActionsContext.js'

const getLobbyRoomFromPathname = (pathname = '') => {
    const match = pathname.match(/\/game\/([^/]+)\/lobby\/([^/?#]+)/)

    if (!match) {
        return null
    }

    return {
        modeKey: match[1],
        roomId: decodeURIComponent(match[2]),
    }
}

const emitWithAck = (eventName, payload) => new Promise((resolve) => {
    socket.emit(eventName, payload, (response) => resolve(response || { success: false }))
})

const CHAT_OPEN_EVENT = 'pvp-tetris:chat-open'

export const UserActionsProvider = ({ children }) => {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const location = useLocation()
    const requestControllerRef = useRef(null)
    const [menu, setMenu] = useState(null)
    const [result, setResult] = useState(null)
    const [status, setStatus] = useState('idle')
    const [isInviting, setIsInviting] = useState(false)
    const [isSendingFriendRequest, setIsSendingFriendRequest] = useState(false)
    const [isOpeningChat, setIsOpeningChat] = useState(false)

    const closeUserActions = useCallback(() => {
        requestControllerRef.current?.abort()
        requestControllerRef.current = null
        setMenu(null)
        setResult(null)
        setStatus('idle')
        setIsInviting(false)
        setIsSendingFriendRequest(false)
        setIsOpeningChat(false)
    }, [])

    const loadActions = useCallback(async (player) => {
        requestControllerRef.current?.abort()
        const controller = new AbortController()
        requestControllerRef.current = controller
        setResult(null)
        setStatus('loading')

        try {
            const response = await usersAPI.getActions(player.id, {
                signal: controller.signal,
            })

            if (!controller.signal.aborted) {
                setResult(response)
                setStatus('ready')
            }
        } catch {
            if (!controller.signal.aborted) {
                setStatus('error')
            }
        }
    }, [])

    const openUserActions = useCallback((player, anchorElement) => {
        const normalizedId = Number(player?.id ?? player?.userId)

        if (!Number.isInteger(normalizedId) || normalizedId <= 0 || !anchorElement) {
            return
        }

        if (menu?.player.id === normalizedId) {
            closeUserActions()
            return
        }

        const normalizedPlayer = {
            ...player,
            id: normalizedId,
            username: player.username || player.nickname || t('userActions.playerFallback'),
            avatarUrl: player.avatarUrl || player.avatar_url || null,
        }

        setMenu({
            player: normalizedPlayer,
            anchorElement,
            anchorRect: anchorElement.getBoundingClientRect(),
        })
        void loadActions(normalizedPlayer)
    }, [closeUserActions, loadActions, menu?.player.id, t])

    const retryUserActions = useCallback(() => {
        if (menu?.player) {
            void loadActions(menu.player)
        }
    }, [loadActions, menu?.player])

    const inviteToRoom = useCallback(async (player) => {
        if (!player?.id || isInviting) {
            return false
        }

        const currentRoom = getLobbyRoomFromPathname(location.pathname)

        if (!currentRoom?.roomId) {
            const language = getLanguageFromPathname(location.pathname) || DEFAULT_LANGUAGE
            navigate(getLocalizedGamePath('/game/1v1/lobby', language), {
                state: {
                    autoCreateRoom: true,
                    inviteFriendId: player.id,
                    modeKey: '1v1',
                },
            })
            closeUserActions()
            return true
        }

        setIsInviting(true)

        try {
            const response = await emitWithAck('friends:room-invite:send', {
                friendId: player.id,
                roomId: currentRoom.roomId,
            })

            if (!response.success) {
                notify(response.message || t('userActions.notifications.inviteError'), 'error')
                return false
            }

            notify(t('userActions.notifications.inviteSent'), 'success')
            closeUserActions()
            return true
        } finally {
            setIsInviting(false)
        }
    }, [closeUserActions, isInviting, location.pathname, navigate, t])

    const openDirectChat = useCallback(async (player) => {
        if (!player?.id || isOpeningChat) {
            return false
        }

        setIsOpeningChat(true)

        try {
            const response = await chatAPI.createDirectConversation(player.id)
            window.dispatchEvent(new CustomEvent(CHAT_OPEN_EVENT, {
                detail: {
                    conversation: response.conversation,
                },
            }))
            notify(t('userActions.notifications.chatReady'), 'success')
            closeUserActions()
            return true
        } catch (error) {
            notify(
                error.message || t('userActions.notifications.chatError'),
                'error'
            )
            return false
        } finally {
            setIsOpeningChat(false)
        }
    }, [closeUserActions, isOpeningChat, t])

    const sendFriendRequest = useCallback(async (player) => {
        if (!player?.id || isSendingFriendRequest) {
            return false
        }

        setIsSendingFriendRequest(true)

        try {
            await friendsAPI.sendRequest(player.id)
            notify(t('userActions.notifications.friendRequestSent'), 'success')
            closeUserActions()
            return true
        } catch (error) {
            notify(
                error.message || t('userActions.notifications.friendRequestError'),
                'error'
            )
            return false
        } finally {
            setIsSendingFriendRequest(false)
        }
    }, [closeUserActions, isSendingFriendRequest, t])

    useEffect(() => () => {
        requestControllerRef.current?.abort()
    }, [])

    useEffect(() => {
        closeUserActions()
    }, [closeUserActions, location.pathname])

    const contextValue = useMemo(() => ({
        closeUserActions,
        openUserActions,
    }), [closeUserActions, openUserActions])

    return (
        <UserActionsContext.Provider value={contextValue}>
            {children}
            {menu ? (
                <UserActionsMenu
                    anchorElement={menu.anchorElement}
                    anchorRect={menu.anchorRect}
                    isInviting={isInviting}
                    isOpeningChat={isOpeningChat}
                    isSendingFriendRequest={isSendingFriendRequest}
                    result={result}
                    status={status}
                    targetUser={menu.player}
                    onClose={closeUserActions}
                    onFriendRequest={sendFriendRequest}
                    onMessage={openDirectChat}
                    onRetry={retryUserActions}
                    onRoomInvite={inviteToRoom}
                />
            ) : null}
        </UserActionsContext.Provider>
    )
}
