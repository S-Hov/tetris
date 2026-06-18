import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'

import { getBaseUrl } from '@/shared/api/apiClient.js'
import { usersAPI } from '@/shared/api/users'

import './UserActionsMenu.css'

const ACTIONS = [
    { key: 'roomInvite', icon: 'fas fa-door-open' },
    { key: 'matchInvite', icon: 'fas fa-gamepad' },
    { key: 'message', icon: 'fas fa-message' },
    { key: 'profile', icon: 'fas fa-id-card' },
]

const MENU_MARGIN = 10

const UserActionsMenu = ({
    anchorElement,
    anchorRect,
    onClose,
    onRoomInvite,
    targetUser,
}) => {
    const { t } = useTranslation()
    const menuRef = useRef(null)
    const [result, setResult] = useState(null)
    const [status, setStatus] = useState('loading')
    const [isInviting, setIsInviting] = useState(false)
    const [requestVersion, setRequestVersion] = useState(0)
    const [position, setPosition] = useState({
        left: Math.max(MENU_MARGIN, anchorRect.left - 292 - MENU_MARGIN),
        top: Math.max(MENU_MARGIN, anchorRect.top),
    })

    useEffect(() => {
        const controller = new AbortController()
        setStatus('loading')
        setResult(null)

        usersAPI.getActions(targetUser.id, {
            signal: controller.signal,
        })
            .then((response) => {
                setResult(response)
                setStatus('ready')
            })
            .catch((error) => {
                if (error?.name !== 'AbortError') {
                    setStatus('error')
                }
            })

        return () => controller.abort()
    }, [requestVersion, targetUser.id])

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (menuRef.current?.contains(event.target) || anchorElement?.contains(event.target)) {
                return
            }

            onClose()
        }
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        document.addEventListener('pointerdown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)
        window.addEventListener('resize', onClose)
        window.addEventListener('scroll', onClose, true)

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('resize', onClose)
            window.removeEventListener('scroll', onClose, true)
        }
    }, [anchorElement, onClose])

    useLayoutEffect(() => {
        const menu = menuRef.current

        if (!menu) {
            return
        }

        const width = menu.offsetWidth
        const height = menu.offsetHeight
        const hasSpaceOnLeft = anchorRect.left >= width + MENU_MARGIN * 2
        const preferredLeft = hasSpaceOnLeft
            ? anchorRect.left - width - MENU_MARGIN
            : anchorRect.right + MENU_MARGIN
        const left = Math.min(
            Math.max(MENU_MARGIN, preferredLeft),
            window.innerWidth - width - MENU_MARGIN
        )
        const top = Math.min(
            Math.max(MENU_MARGIN, anchorRect.top),
            window.innerHeight - height - MENU_MARGIN
        )

        setPosition({ left, top })
    }, [anchorRect, result, status])

    const handleRoomInvite = async () => {
        if (isInviting) {
            return
        }

        setIsInviting(true)

        try {
            const didFinish = await onRoomInvite(result?.user || targetUser)

            if (didFinish) {
                onClose()
            }
        } finally {
            setIsInviting(false)
        }
    }

    const visibleActions = ACTIONS.filter(({ key }) => result?.actions?.[key]?.visible)
    const user = result?.user || targetUser

    return createPortal(
        <div
            ref={menuRef}
            className="user-actions-menu"
            role="dialog"
            aria-label={t('userActions.ariaLabel', { username: user.username })}
            style={{
                left: `${position.left}px`,
                top: `${position.top}px`,
            }}
        >
            <header className="user-actions-menu__header">
                <span className="user-actions-menu__avatar">
                    {user.avatarUrl
                        ? renderAvatarMedia(getAssetUrl(user.avatarUrl), user.username)
                        : getAvatarFallback(user.username)}
                </span>
                <span>
                    <small>{t('userActions.eyebrow')}</small>
                    <strong>{user.username}</strong>
                </span>
                <button type="button" aria-label={t('userActions.close')} onClick={onClose}>
                    <i className="fas fa-xmark"></i>
                </button>
            </header>

            {status === 'loading' ? (
                <div className="user-actions-menu__state">
                    <i className="fas fa-circle-notch fa-spin"></i>
                    <span>{t('userActions.loading')}</span>
                </div>
            ) : status === 'error' ? (
                <div className="user-actions-menu__state">
                    <i className="fas fa-triangle-exclamation"></i>
                    <span>{t('userActions.loadError')}</span>
                    <button type="button" onClick={() => setRequestVersion((value) => value + 1)}>
                        {t('userActions.retry')}
                    </button>
                </div>
            ) : visibleActions.length ? (
                <div className="user-actions-menu__actions">
                    {visibleActions.map(({ key, icon }) => {
                        const action = result.actions[key]
                        const isRoomInvite = key === 'roomInvite'
                        const isDisabled = !action.enabled || (isRoomInvite && isInviting)

                        return (
                            <button
                                key={key}
                                type="button"
                                disabled={isDisabled}
                                onClick={isRoomInvite ? handleRoomInvite : undefined}
                            >
                                <i className={icon}></i>
                                <span>
                                    <strong>{t(`userActions.actions.${key}`)}</strong>
                                    {!action.enabled ? <small>{t(`userActions.reasons.${action.reason}`)}</small> : null}
                                </span>
                                {isRoomInvite && isInviting ? (
                                    <i className="fas fa-circle-notch fa-spin"></i>
                                ) : (
                                    <i className="fas fa-chevron-right"></i>
                                )}
                            </button>
                        )
                    })}
                </div>
            ) : (
                <div className="user-actions-menu__state">
                    <i className="fas fa-user-lock"></i>
                    <span>{t('userActions.empty')}</span>
                </div>
            )}
        </div>,
        document.body
    )
}

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

export default UserActionsMenu
