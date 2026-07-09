import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import './MobileQuickDock.css'

const ACTIONS = [
    {
        key: 'chat',
        icon: 'fas fa-message',
        className: 'mobile-quick-dock__action--chat',
    },
    {
        key: 'audio',
        icon: 'fas fa-music',
        className: 'mobile-quick-dock__action--audio',
    },
    {
        key: 'friends',
        icon: 'fas fa-user-group',
        className: 'mobile-quick-dock__action--friends',
    },
]

const MobileQuickDock = ({ onAudio, onChat, onFriends }) => {
    const { t } = useTranslation()
    const dockRef = useRef(null)
    const [isOpen, setIsOpen] = useState(false)

    useEffect(() => {
        if (!isOpen) {
            return undefined
        }

        const handlePointerDown = (event) => {
            if (!dockRef.current?.contains(event.target)) {
                setIsOpen(false)
            }
        }
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false)
            }
        }

        document.addEventListener('pointerdown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [isOpen])

    const handleAction = (key) => {
        setIsOpen(false)

        if (key === 'chat') {
            onChat?.()
        } else if (key === 'audio') {
            onAudio?.()
        } else if (key === 'friends') {
            onFriends?.()
        }
    }

    return (
        <aside
            ref={dockRef}
            className={`mobile-quick-dock ${isOpen ? 'mobile-quick-dock--open' : ''}`}
            aria-label={t('quickDock.ariaLabel')}
        >
            <div className="mobile-quick-dock__actions" aria-hidden={!isOpen}>
                {ACTIONS.map((action) => (
                    <button
                        key={action.key}
                        type="button"
                        className={`mobile-quick-dock__action ${action.className}`}
                        aria-label={t(`quickDock.actions.${action.key}`)}
                        tabIndex={isOpen ? 0 : -1}
                        title={t(`quickDock.actions.${action.key}`)}
                        onClick={() => handleAction(action.key)}
                    >
                        <i className={action.icon}></i>
                    </button>
                ))}
            </div>

            <button
                type="button"
                className="mobile-quick-dock__trigger"
                aria-expanded={isOpen}
                aria-label={isOpen ? t('quickDock.close') : t('quickDock.open')}
                title={isOpen ? t('quickDock.close') : t('quickDock.open')}
                onClick={() => setIsOpen((currentValue) => !currentValue)}
            >
                <span className="mobile-quick-dock__pulse"></span>
                <i className={isOpen ? 'fas fa-xmark' : 'fas fa-bolt'}></i>
            </button>
        </aside>
    )
}

export default MobileQuickDock
