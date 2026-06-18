import { useCallback, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { getBaseUrl } from '@/shared/api/apiClient.js'
import { socket } from '@/shared/api/socket'
import { useAuth } from '@/shared/hooks/useAuth.js'
import useFriendsRealtime from '@/shared/hooks/useFriendsRealtime.js'
import { DEFAULT_LANGUAGE, getLanguageFromPathname, getLocalizedGamePath, getLocalizedPath } from '@/i18n'
import notify from '@/utils/Notifications'
import UserActionsMenu from '@/widgets/UserActionsMenu'

import './FriendsRail.css'

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

const FriendsRail = () => {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const location = useLocation()
    const { isAuth, isLoading: isAuthLoading, user } = useAuth()
    const friendsState = useFriendsRealtime({ enabled: isAuth && !isAuthLoading })
    const [actionMenu, setActionMenu] = useState(null)
    const [invitingFriendId, setInvitingFriendId] = useState(null)

    const currentUserKey = user?.id || 'authorized'
    const friends = useMemo(
        () => friendsState.userId === currentUserKey ? friendsState.friends : [],
        [currentUserKey, friendsState.friends, friendsState.userId]
    )
    const requestsCount = friendsState.userId === currentUserKey ? friendsState.requestsCount : 0
    const isFriendsLoading = isAuth && !isAuthLoading && friendsState.userId !== currentUserKey
    const hasLoadError = friendsState.userId === currentUserKey && friendsState.status === 'error'
    const onlineFriends = useMemo(() => friends.filter((friend) => friend.isOnline), [friends])
    const offlineFriends = useMemo(() => friends.filter((friend) => !friend.isOnline), [friends])
    const totalFriends = friends.length
    const badgeValue = isAuth ? onlineFriends.length : '!'

    const handleInviteFriend = async (friend) => {
        if (!friend?.id || invitingFriendId) {
            return false
        }

        if (friend.isInGame) {
            notify(t('friendsRail.inviteInGame'), 'warning')
            return false
        }

        const currentRoom = getLobbyRoomFromPathname(location.pathname)

        if (!currentRoom?.roomId) {
            const language = getLanguageFromPathname(location.pathname) || DEFAULT_LANGUAGE
            navigate(getLocalizedGamePath('/game/1v1/lobby', language), {
                state: {
                    autoCreateRoom: true,
                    inviteFriendId: friend.id,
                    modeKey: '1v1',
                },
            })
            return true
        }

        setInvitingFriendId(friend.id)

        try {
            const response = await emitWithAck('friends:room-invite:send', {
                friendId: friend.id,
                roomId: currentRoom.roomId,
            })

            if (!response.success) {
                notify(response.message || t('friendsRail.inviteError'), 'error')
                return false
            }

            notify(t('friendsRail.inviteSent'), 'success')
            return true
        } finally {
            setInvitingFriendId(null)
        }
    }

    const closeActionMenu = useCallback(() => {
        setActionMenu(null)
    }, [])

    const handleFriendClick = (friend, element) => {
        if (actionMenu?.friend.id === friend.id) {
            closeActionMenu()
            return
        }

        setActionMenu({
            friend,
            element,
            rect: element.getBoundingClientRect(),
        })
    }

    return (
        <aside className="friends-rail" aria-label={t('friendsRail.ariaLabel')} tabIndex={0}>
            <header className="friends-rail__header">
                <span className="friends-rail__icon" aria-hidden="true">
                    <i className="fas fa-user-group"></i>
                </span>
                <span className="friends-rail__title">
                    <small>{t('friendsRail.eyebrow')}</small>
                    <strong>{t('friendsRail.title')}</strong>
                </span>
                <span className="friends-rail__badge">{badgeValue}</span>
            </header>

            <div className="friends-rail__content">
                {isAuthLoading || isFriendsLoading ? (
                    <RailEmpty icon="fas fa-circle-notch" text={t('friendsRail.loading')} />
                ) : isAuth ? (
                    <>
                        <div className="friends-rail__summary">
                            <span>
                                <strong>{totalFriends}</strong>
                                {t('friendsRail.total')}
                            </span>
                            <span>
                                <strong>{onlineFriends.length}</strong>
                                {t('friendsRail.online')}
                            </span>
                            <Link to={getLocalizedPath('/friends/requests')}>
                                <strong>{requestsCount}</strong>
                                {t('friendsRail.requests')}
                            </Link>
                        </div>

                        {hasLoadError ? (
                            <RailEmpty icon="fas fa-triangle-exclamation" text={t('friendsRail.loadError')} />
                        ) : totalFriends > 0 ? (
                            <div className="friends-rail__scroll" aria-label={t('friendsRail.listLabel')}>
                                <FriendSection
                                    friends={onlineFriends}
                                    isOnlineSection
                                    title={t('friendsRail.sections.online')}
                                    onSelect={handleFriendClick}
                                    t={t}
                                />
                                <FriendSection
                                    friends={offlineFriends}
                                    title={t('friendsRail.sections.offline')}
                                    onSelect={handleFriendClick}
                                    t={t}
                                />
                            </div>
                        ) : (
                            <RailEmpty icon="fas fa-user-plus" text={t('friendsRail.empty')} />
                        )}

                        <Link className="friends-rail__find" to={getLocalizedPath('/friends/search')}>
                            <i className="fas fa-magnifying-glass"></i>
                            {t('friendsRail.findFriend')}
                        </Link>
                    </>
                ) : (
                    <div className="friends-rail__guest">
                        <span className="friends-rail__guest-icon" aria-hidden="true">
                            <i className="fas fa-lock"></i>
                        </span>
                        <strong>{t('friendsRail.guestTitle')}</strong>
                        <p>{t('friendsRail.guestText')}</p>
                        <Link className="friends-rail__register" to={getLocalizedPath('/register')}>
                            <i className="fas fa-user-plus"></i>
                            {t('friendsRail.register')}
                        </Link>
                    </div>
                )}
            </div>

            {actionMenu ? (
                <UserActionsMenu
                    anchorElement={actionMenu.element}
                    anchorRect={actionMenu.rect}
                    targetUser={actionMenu.friend}
                    onClose={closeActionMenu}
                    onRoomInvite={handleInviteFriend}
                />
            ) : null}
        </aside>
    )
}

const FriendSection = ({
    friends,
    isOnlineSection = false,
    onSelect,
    t,
    title,
}) => (
    <section className="friends-rail__section">
        <h3>{title}</h3>
        {friends.length > 0 ? (
            <div className="friends-rail__list">
                {friends.map((friend) => (
                    <FriendItem
                        friend={friend}
                        key={friend.id}
                        onSelect={onSelect}
                        t={t}
                    />
                ))}
            </div>
        ) : (
            <p className="friends-rail__section-empty">
                {isOnlineSection ? t('friendsRail.noOnline') : t('friendsRail.noOffline')}
            </p>
        )}
    </section>
)

const FriendItem = ({ friend, onSelect, t }) => {
    const content = (
        <>
            <span className="friends-rail__avatar">
                {friend.avatarUrl ? renderAvatarMedia(getAssetUrl(friend.avatarUrl), friend.username) : getAvatarFallback(friend.username)}
            </span>
            <span className={`friends-rail__status ${friend.isOnline ? 'is-online' : 'is-offline'}`} aria-hidden="true"></span>
            <span className="friends-rail__item-body">
                <strong>{friend.username}</strong>
                <small>{friend.isInGame ? t('friendsRail.status.inGame') : friend.isOnline ? t('friendsRail.status.online') : t('friendsRail.status.offline')}</small>
            </span>
        </>
    )

    return (
        <article className="friends-rail__item">
            <button
                className="friends-rail__item-main"
                type="button"
                aria-haspopup="dialog"
                onClick={(event) => onSelect(friend, event.currentTarget)}
            >
                {content}
            </button>
        </article>
    )
}

const RailEmpty = ({ icon, text }) => (
    <div className="friends-rail__empty">
        <span className="friends-rail__loader" aria-hidden="true">
            <i className={icon}></i>
        </span>
        <p>{text}</p>
    </div>
)

const getAssetUrl = (value) => {
    if (!value) return ''
    if (/^https?:\/\//i.test(value)) return value

    return `${getBaseUrl()}${value.startsWith('/') ? value : `/${value}`}`
}

const renderAvatarMedia = (src, username) => {
    if (/\.(webm|mp4|mov|ogg|ogv|m4v)(?:[?#]|$)/i.test(src)) {
        return <video src={src} autoPlay loop muted playsInline aria-label={username} />
    }

    return <img src={src} alt={username} />
}

const getAvatarFallback = (username = '') => username.trim().charAt(0).toUpperCase() || 'P'

export default FriendsRail
