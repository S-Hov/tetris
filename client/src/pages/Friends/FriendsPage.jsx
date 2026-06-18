import { useMemo, useState } from 'react'
import { Navigate, NavLink, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import ProfileSideNav from '@/widgets/ProfileSideNav'
import { getBaseUrl } from '@/shared/api/apiClient.js'
import { friendsAPI } from '@/shared/api/friends'
import useFriendsRealtime from '@/shared/hooks/useFriendsRealtime.js'
import notify from '@/utils/Notifications'
import PlayerActionTrigger from '@/shared/ui/PlayerActionTrigger'

import {
    DEFAULT_FRIENDS_SECTION,
    FRIENDS_SECTION_KEYS,
    FRIENDS_SECTIONS,
} from './friendsPage.config.js'

import './FriendsPage.css'

const FriendsPage = () => {
    const { section } = useParams()
    const { t } = useTranslation()
    const activeSection = section || DEFAULT_FRIENDS_SECTION
    const isKnownSection = FRIENDS_SECTION_KEYS.includes(activeSection)
    const friendsState = useFriendsRealtime({ enabled: activeSection === 'friends' || activeSection === 'requests' })
    const [searchId, setSearchId] = useState('')
    const [searchResult, setSearchResult] = useState(null)
    const [isSearching, setIsSearching] = useState(false)
    const [isSendingRequest, setIsSendingRequest] = useState(false)
    const [updatingRequestId, setUpdatingRequestId] = useState(null)

    const friends = friendsState.friends
    const requests = friendsState.requests
    const isFriendsLoading = activeSection === 'friends' && ['idle', 'loading'].includes(friendsState.status)
    const isRequestsLoading = activeSection === 'requests' && ['idle', 'loading'].includes(friendsState.status)
    const onlineCount = useMemo(() => friends.filter((friend) => friend.isOnline).length, [friends])

    const handleSearchSubmit = async (event) => {
        event.preventDefault()
        const normalizedId = searchId.trim()

        if (!normalizedId) return

        setIsSearching(true)
        setSearchResult(null)

        try {
            const response = await friendsAPI.findById(normalizedId)
            setSearchResult(response.user || null)
        } catch (error) {
            notify(error.message || t('friends.notifications.searchError'), 'error')
        } finally {
            setIsSearching(false)
        }
    }

    const handleSendRequest = async () => {
        if (!searchResult?.id) return

        setIsSendingRequest(true)

        try {
            await friendsAPI.sendRequest(searchResult.id)
            setSearchResult((currentValue) => currentValue
                ? { ...currentValue, friendshipStatus: 'pending', isOutgoingRequest: true }
                : currentValue)
            friendsState.refresh()
            notify(t('friends.notifications.requestSent'), 'success')
        } catch (error) {
            notify(error.message || t('friends.notifications.requestSendError'), 'error')
        } finally {
            setIsSendingRequest(false)
        }
    }

    const handleRespondRequest = async (requestId, action) => {
        setUpdatingRequestId(requestId)

        try {
            await friendsAPI.respondRequest(requestId, action)
            friendsState.refresh()
            notify(t(action === 'accept'
                ? 'friends.notifications.requestAccepted'
                : 'friends.notifications.requestDeclined'), 'success')
        } catch (error) {
            notify(error.message || t('friends.notifications.requestUpdateError'), 'error')
        } finally {
            setUpdatingRequestId(null)
        }
    }

    if (!section) {
        return <Navigate to={`/friends/${DEFAULT_FRIENDS_SECTION}`} replace />
    }

    if (!isKnownSection) {
        return <Navigate to={`/friends/${DEFAULT_FRIENDS_SECTION}`} replace />
    }

    return (
        <section className="section friends-page">
            <div className="container friends-container profile-layout-shell">
                <ProfileSideNav />

                <div className="friends-content profile-layout-content">
                    <header className="friends-hero account-settings-panel">
                        <span>{t('friends.hero.eyebrow')}</span>
                        <h1>{t('friends.hero.title')}</h1>
                        <p>{t('friends.hero.description')}</p>
                    </header>

                    <nav className="friends-tabs" aria-label={t('friends.tabs.aria')}>
                        {FRIENDS_SECTIONS.map((item) => (
                            <NavLink
                                key={item.key}
                                to={`/friends/${item.key}`}
                                className={({ isActive }) => isActive ? 'is-active' : undefined}
                            >
                                <i className={item.icon}></i>
                                {t(item.labelKey)}
                            </NavLink>
                        ))}
                    </nav>

                    {activeSection === 'friends' && (
                        <FriendsList
                            friends={friends}
                            isLoading={isFriendsLoading}
                            onlineCount={onlineCount}
                            t={t}
                        />
                    )}

                    {activeSection === 'requests' && (
                        <FriendRequests
                            isLoading={isRequestsLoading}
                            onRespond={handleRespondRequest}
                            requests={requests}
                            t={t}
                            updatingRequestId={updatingRequestId}
                        />
                    )}

                    {activeSection === 'search' && (
                        <FriendSearch
                            isSearching={isSearching}
                            isSendingRequest={isSendingRequest}
                            onSearchIdChange={setSearchId}
                            onSendRequest={handleSendRequest}
                            onSubmit={handleSearchSubmit}
                            searchId={searchId}
                            searchResult={searchResult}
                            t={t}
                        />
                    )}
                </div>
            </div>
        </section>
    )
}

const FriendsList = ({ friends, isLoading, onlineCount, t }) => (
    <section className="friends-panel account-settings-panel">
        <div className="friends-panel__header">
            <h2 className="account-section-title">
                <i className="fas fa-user-group"></i>
                {t('friends.friends.title')}
            </h2>
            <span>{t('friends.friends.onlineCount', { count: onlineCount })}</span>
        </div>

        {isLoading ? (
            <EmptyState text={t('friends.common.loading')} />
        ) : friends.length > 0 ? (
            <div className="friends-grid">
                {friends.map((friend) => (
                    <PlayerCard key={friend.id} player={friend} t={t} />
                ))}
            </div>
        ) : (
            <EmptyState text={t('friends.friends.empty')} />
        )}
    </section>
)

const FriendRequests = ({ isLoading, onRespond, requests, t, updatingRequestId }) => (
    <section className="friends-panel account-settings-panel">
        <div className="friends-panel__header">
            <h2 className="account-section-title">
                <i className="fas fa-bell"></i>
                {t('friends.requests.title')}
            </h2>
            <span>{t('friends.requests.count', { count: requests.length })}</span>
        </div>

        {isLoading ? (
            <EmptyState text={t('friends.common.loading')} />
        ) : requests.length > 0 ? (
            <div className="friends-request-list">
                {requests.map((request) => (
                    <article className="friends-request-card" key={request.requestId}>
                        <PlayerCard player={request} t={t} compact />
                        <div className="friends-request-card__meta">
                            <span>{t('friends.requests.sentAt')}</span>
                            <time>{formatDate(request.requestedAt)}</time>
                        </div>
                        <div className="friends-request-card__actions">
                            <button
                                className="friends-action friends-action--accept"
                                disabled={updatingRequestId === request.requestId}
                                type="button"
                                onClick={() => onRespond(request.requestId, 'accept')}
                            >
                                <i className="fas fa-check"></i>
                                {t('friends.requests.accept')}
                            </button>
                            <button
                                className="friends-action friends-action--decline"
                                disabled={updatingRequestId === request.requestId}
                                type="button"
                                onClick={() => onRespond(request.requestId, 'decline')}
                            >
                                <i className="fas fa-xmark"></i>
                                {t('friends.requests.decline')}
                            </button>
                        </div>
                    </article>
                ))}
            </div>
        ) : (
            <EmptyState text={t('friends.requests.empty')} />
        )}
    </section>
)

const FriendSearch = ({
    isSearching,
    isSendingRequest,
    onSearchIdChange,
    onSendRequest,
    onSubmit,
    searchId,
    searchResult,
    t,
}) => (
    <section className="friends-panel account-settings-panel">
        <div className="friends-panel__header">
            <h2 className="account-section-title">
                <i className="fas fa-magnifying-glass"></i>
                {t('friends.search.title')}
            </h2>
        </div>

        <form className="friends-search-form" onSubmit={onSubmit}>
            <label>
                <span>{t('friends.search.inputLabel')}</span>
                <input
                    inputMode="numeric"
                    min="1"
                    placeholder={t('friends.search.placeholder')}
                    type="number"
                    value={searchId}
                    onChange={(event) => onSearchIdChange(event.target.value)}
                />
            </label>
            <button className="friends-action friends-action--primary" disabled={isSearching} type="submit">
                <i className="fas fa-search"></i>
                {isSearching ? t('friends.search.searching') : t('friends.search.submit')}
            </button>
        </form>

        {searchResult ? (
            <div className="friends-search-result">
                <PlayerCard player={searchResult} t={t} />
                <button
                    className="friends-action friends-action--primary"
                    disabled={isSendingRequest || !canSendRequest(searchResult)}
                    type="button"
                    onClick={onSendRequest}
                >
                    <i className="fas fa-user-plus"></i>
                    {getSearchActionLabel(searchResult, t, isSendingRequest)}
                </button>
            </div>
        ) : (
            <EmptyState text={t('friends.search.empty')} />
        )}
    </section>
)

const PlayerCard = ({ compact = false, player, t }) => (
    <PlayerActionTrigger asChild player={player}>
        <article className={`friends-player-card ${compact ? 'friends-player-card--compact' : ''}`}>
            <span className="friends-player-card__avatar">
                {player.avatarUrl
                    ? renderAvatarMedia(getAssetUrl(player.avatarUrl), player.username)
                    : getAvatarFallback(player.username)}
            </span>
            <span className={`friends-player-card__status ${player.isOnline ? 'is-online' : 'is-offline'}`} title={player.isOnline ? t('friends.status.online') : t('friends.status.offline')}></span>
            <span className="friends-player-card__body">
                <strong>{player.username}</strong>
                <small>ID {player.id}</small>
            </span>
            <span className="friends-player-card__rank">
                <strong>{player.rank?.label || t('friends.rankFallback')}</strong>
                <small>{t('friends.rankPoints', { count: player.rankStats?.rankPoints || 0 })}</small>
            </span>
        </article>
    </PlayerActionTrigger>
)

const EmptyState = ({ text }) => (
    <div className="friends-empty">
        <i className="fas fa-user-group"></i>
        <p>{text}</p>
    </div>
)

const getAvatarFallback = (username = '') => username.trim().charAt(0).toUpperCase() || 'P'

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

const canSendRequest = (player) => (
    !player.isSelf &&
    !['accepted', 'pending', 'blocked'].includes(player.friendshipStatus)
)

const getSearchActionLabel = (player, t, isSendingRequest) => {
    if (isSendingRequest) return t('friends.search.sending')
    if (player.isSelf) return t('friends.search.self')
    if (player.friendshipStatus === 'accepted') return t('friends.search.alreadyFriend')
    if (player.isOutgoingRequest) return t('friends.search.requestSent')
    if (player.isIncomingRequest) return t('friends.search.incomingRequest')
    if (player.friendshipStatus === 'blocked') return t('friends.search.blocked')

    return t('friends.search.sendRequest')
}

const formatDate = (value) => {
    if (!value) return ''

    return new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value))
}

export default FriendsPage
