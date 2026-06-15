import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { getBaseUrl } from '@/shared/api/apiClient.js'
import { friendsAPI } from '@/shared/api/friends'
import { useAuth } from '@/shared/hooks/useAuth.js'

import './FriendsRail.css'

const FriendsRail = () => {
    const { t } = useTranslation()
    const { isAuth, isLoading: isAuthLoading, user } = useAuth()
    const [friendsState, setFriendsState] = useState({
        friends: [],
        requestsCount: 0,
        status: 'idle',
        userId: null,
    })
    const [selectedFriendId, setSelectedFriendId] = useState(null)

    useEffect(() => {
        if (isAuthLoading) return undefined

        if (!isAuth) {
            return undefined
        }

        let ignore = false
        const currentUserId = user?.id || 'authorized'

        const loadFriendsState = () => {
            Promise.all([
                friendsAPI.getFriends(),
                friendsAPI.getIncomingRequests(),
            ])
                .then(([friendsResponse, requestsResponse]) => {
                    if (ignore) return

                    const nextFriends = Array.isArray(friendsResponse.friends) ? friendsResponse.friends : []
                    const nextRequests = Array.isArray(requestsResponse.requests) ? requestsResponse.requests : []

                    setFriendsState({
                        friends: nextFriends,
                        requestsCount: nextRequests.length,
                        status: 'success',
                        userId: currentUserId,
                    })
                })
                .catch(() => {
                    if (!ignore) {
                        setFriendsState({
                            friends: [],
                            requestsCount: 0,
                            status: 'error',
                            userId: currentUserId,
                        })
                    }
                })
        }

        loadFriendsState()
        const refreshIntervalId = window.setInterval(loadFriendsState, 30000)

        return () => {
            ignore = true
            window.clearInterval(refreshIntervalId)
        }
    }, [isAuth, isAuthLoading, user?.id])

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
                            <Link to="/friends/requests">
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
                                    selectedFriendId={selectedFriendId}
                                    title={t('friendsRail.sections.online')}
                                    onSelect={setSelectedFriendId}
                                    t={t}
                                />
                                <FriendSection
                                    friends={offlineFriends}
                                    selectedFriendId={selectedFriendId}
                                    title={t('friendsRail.sections.offline')}
                                    onSelect={setSelectedFriendId}
                                    t={t}
                                />
                            </div>
                        ) : (
                            <RailEmpty icon="fas fa-user-plus" text={t('friendsRail.empty')} />
                        )}

                        <Link className="friends-rail__find" to="/friends/search">
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
                        <Link className="friends-rail__register" to="/register">
                            <i className="fas fa-user-plus"></i>
                            {t('friendsRail.register')}
                        </Link>
                    </div>
                )}
            </div>
        </aside>
    )
}

const FriendSection = ({ friends, isOnlineSection = false, onSelect, selectedFriendId, t, title }) => (
    <section className="friends-rail__section">
        <h3>{title}</h3>
        {friends.length > 0 ? (
            <div className="friends-rail__list">
                {friends.map((friend) => (
                    <FriendItem
                        friend={friend}
                        isExpanded={selectedFriendId === friend.id}
                        isOnlineSection={isOnlineSection}
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

const FriendItem = ({ friend, isExpanded, isOnlineSection, onSelect, t }) => {
    const content = (
        <>
            <span className="friends-rail__avatar">
                {friend.avatarUrl ? renderAvatarMedia(getAssetUrl(friend.avatarUrl), friend.username) : getAvatarFallback(friend.username)}
            </span>
            <span className={`friends-rail__status ${friend.isOnline ? 'is-online' : 'is-offline'}`} aria-hidden="true"></span>
            <span className="friends-rail__item-body">
                <strong>{friend.username}</strong>
                <small>{friend.isOnline ? t('friendsRail.status.online') : t('friendsRail.status.offline')}</small>
            </span>
        </>
    )

    return (
        <article className={`friends-rail__item ${isExpanded ? 'is-expanded' : ''}`}>
            {isOnlineSection ? (
                <button
                    className="friends-rail__item-main"
                    type="button"
                    aria-expanded={isExpanded}
                    onClick={() => onSelect(isExpanded ? null : friend.id)}
                >
                    {content}
                </button>
            ) : (
                <div className="friends-rail__item-main">
                    {content}
                </div>
            )}

            {isOnlineSection && isExpanded ? (
                <button className="friends-rail__invite" type="button">
                    <i className="fas fa-paper-plane"></i>
                    {t('friendsRail.invite')}
                </button>
            ) : null}
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
