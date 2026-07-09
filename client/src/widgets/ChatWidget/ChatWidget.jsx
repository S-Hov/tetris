import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { chatAPI } from '@/shared/api/chat'
import { socket } from '@/shared/api/socket'
import { getBaseUrl } from '@/shared/api/apiClient.js'
import { useAuth } from '@/shared/hooks/useAuth.js'
import notify from '@/utils/Notifications'

import './ChatWidget.css'

const CHAT_OPEN_EVENT = 'pvp-tetris:chat-open'
const ENTER_KEY = 'Enter'
const MOBILE_CHAT_MEDIA_QUERY = '(max-width: 560px)'

const emitWithAck = (eventName, payload) => new Promise((resolve) => {
    if (!socket.connected) {
        resolve({ success: false, message: 'CHAT.SOCKET_OFFLINE' })
        return
    }

    socket.emit(eventName, payload, (response) => resolve(response || { success: false }))
})

const sortConversations = (items = []) => {
    return [...items].sort((left, right) => (
        new Date(right.updatedAt || right.createdAt || 0).getTime() -
        new Date(left.updatedAt || left.createdAt || 0).getTime()
    ))
}

const upsertConversation = (items, nextConversation) => {
    if (!nextConversation?.id) {
        return items
    }

    const nextItems = items.filter((conversation) => conversation.id !== nextConversation.id)

    return sortConversations([nextConversation, ...nextItems])
}

const upsertMessage = (items, nextMessage) => {
    if (!nextMessage?.id) {
        return items
    }

    if (items.some((message) => message.id === nextMessage.id)) {
        return items.map((message) => message.id === nextMessage.id ? nextMessage : message)
    }

    return [...items, nextMessage]
}

const ChatWidget = ({ hideTrigger = false, openSignal = 0 } = {}) => {
    const { t } = useTranslation()
    const { isAuth, user } = useAuth()
    const previousOpenSignalRef = useRef(openSignal)
    const [isOpen, setIsOpen] = useState(false)
    const [isSidebarVisible, setIsSidebarVisible] = useState(true)
    const [conversations, setConversations] = useState([])
    const [activeConversationId, setActiveConversationId] = useState(null)
    const [messagesByConversation, setMessagesByConversation] = useState({})
    const [draft, setDraft] = useState('')
    const [isLoadingConversations, setIsLoadingConversations] = useState(false)
    const [isLoadingMessages, setIsLoadingMessages] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const widgetRef = useRef(null)
    const messagesEndRef = useRef(null)

    const activeConversation = useMemo(
        () => conversations.find((conversation) => conversation.id === activeConversationId) || null,
        [activeConversationId, conversations]
    )
    const activeMessages = activeConversationId ? messagesByConversation[activeConversationId] || [] : []
    const totalUnread = conversations.reduce((total, conversation) => total + (Number(conversation.unreadCount) || 0), 0)

    const loadConversations = useCallback(async () => {
        if (!isAuth) {
            setConversations([])
            setActiveConversationId(null)
            return
        }

        setIsLoadingConversations(true)

        try {
            const response = await chatAPI.getConversations({ limit: 50 })
            const nextConversations = sortConversations(response.conversations || [])

            setConversations(nextConversations)
            setActiveConversationId((currentId) => (
                currentId && nextConversations.some((conversation) => conversation.id === currentId)
                    ? currentId
                    : nextConversations[0]?.id || null
            ))
        } catch (error) {
            notify(error.message || t('chatWidget.errors.loadConversations'), 'error')
        } finally {
            setIsLoadingConversations(false)
        }
    }, [isAuth, t])

    const loadMessages = useCallback(async (conversationId) => {
        if (!conversationId || !isAuth) {
            return
        }

        setIsLoadingMessages(true)

        try {
            const response = await chatAPI.getMessages(conversationId, { limit: 50 })
            const messages = response.messages || []

            setMessagesByConversation((currentValue) => ({
                ...currentValue,
                [conversationId]: messages,
            }))

            const lastMessage = messages[messages.length - 1]

            if (lastMessage?.id) {
                void chatAPI.markRead(conversationId, lastMessage.id).catch(() => {})
            }
        } catch (error) {
            notify(error.message || t('chatWidget.errors.loadMessages'), 'error')
        } finally {
            setIsLoadingMessages(false)
        }
    }, [isAuth, t])

    useEffect(() => {
        void loadConversations()
    }, [loadConversations])

    useEffect(() => {
        if (previousOpenSignalRef.current === openSignal) {
            return undefined
        }

        previousOpenSignalRef.current = openSignal
        let isCancelled = false

        queueMicrotask(() => {
            if (!isCancelled) {
                setIsOpen(true)
            }
        })

        return () => {
            isCancelled = true
        }
    }, [openSignal])

    useEffect(() => {
        if (isOpen && activeConversationId && !messagesByConversation[activeConversationId]) {
            void loadMessages(activeConversationId)
        }
    }, [activeConversationId, isOpen, loadMessages, messagesByConversation])

    useEffect(() => {
        if (!isOpen) {
            return undefined
        }

        const handlePointerDown = (event) => {
            if (!widgetRef.current?.contains(event.target)) {
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

    useEffect(() => {
        const handleOpenConversation = (event) => {
            const conversation = event.detail?.conversation

            if (!conversation?.id) {
                setIsOpen(true)
                return
            }

            setConversations((currentValue) => upsertConversation(currentValue, conversation))
            setActiveConversationId(conversation.id)
            setIsSidebarVisible(true)
            setIsOpen(true)
        }

        window.addEventListener(CHAT_OPEN_EVENT, handleOpenConversation)

        return () => window.removeEventListener(CHAT_OPEN_EVENT, handleOpenConversation)
    }, [])

    useEffect(() => {
        const handleNewMessage = ({ conversation, message } = {}) => {
            if (!conversation?.id || !message?.id) {
                return
            }

            setConversations((currentValue) => upsertConversation(currentValue, {
                ...conversation,
                lastMessage: message,
                unreadCount: conversation.id === activeConversationId && isOpen
                    ? 0
                    : Number(conversation.unreadCount) || 1,
                updatedAt: message.createdAt || conversation.updatedAt,
            }))
            setMessagesByConversation((currentValue) => ({
                ...currentValue,
                [conversation.id]: upsertMessage(currentValue[conversation.id] || [], message),
            }))

            if (conversation.id === activeConversationId && isOpen) {
                void chatAPI.markRead(conversation.id, message.id).catch(() => {})
            }
        }

        const handleRead = (readState = {}) => {
            if (!readState.conversationId) {
                return
            }

            setConversations((currentValue) => currentValue.map((conversation) => (
                conversation.id === readState.conversationId && readState.userId === user?.id
                    ? { ...conversation, unreadCount: 0, lastReadMessageId: readState.lastReadMessageId }
                    : conversation
            )))
        }

        socket.on('chat:message:new', handleNewMessage)
        socket.on('chat:message:read', handleRead)

        return () => {
            socket.off('chat:message:new', handleNewMessage)
            socket.off('chat:message:read', handleRead)
        }
    }, [activeConversationId, isOpen, user?.id])

    useEffect(() => {
        if (isOpen && activeConversationId) {
            messagesEndRef.current?.scrollIntoView({ block: 'end' })
        }
    }, [activeConversationId, activeMessages.length, isOpen])

    if (!isAuth) {
        return null
    }

    const handleConversationSelect = (conversationId) => {
        setActiveConversationId(conversationId)

        if (window.matchMedia?.(MOBILE_CHAT_MEDIA_QUERY).matches) {
            setIsSidebarVisible(false)
        }

        if (!messagesByConversation[conversationId]) {
            void loadMessages(conversationId)
        }
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        const text = draft.trim()

        if (!activeConversation || !text || isSending) {
            return
        }

        setIsSending(true)

        try {
            const response = await emitWithAck('chat:message:send', {
                conversationId: activeConversation.id,
                text,
            })

            if (!response.success) {
                notify(response.message || t('chatWidget.errors.send'), 'error')
                return
            }

            setDraft('')
            setConversations((currentValue) => upsertConversation(currentValue, {
                ...response.conversation,
                lastMessage: response.message,
                unreadCount: 0,
                updatedAt: response.message?.createdAt || response.conversation?.updatedAt,
            }))
            setMessagesByConversation((currentValue) => ({
                ...currentValue,
                [response.conversation.id]: upsertMessage(currentValue[response.conversation.id] || [], response.message),
            }))
        } finally {
            setIsSending(false)
        }
    }

    const handleDraftKeyDown = (event) => {
        if (event.key === ENTER_KEY && !event.shiftKey) {
            event.preventDefault()
            event.currentTarget.form?.requestSubmit()
        }
    }

    return (
        <aside
            ref={widgetRef}
            className={[
                'chat-widget',
                isOpen ? 'chat-widget--open' : '',
                isSidebarVisible ? '' : 'chat-widget--sidebar-hidden',
            ].filter(Boolean).join(' ')}
            aria-label={t('chatWidget.ariaLabel')}
        >
            <section className="chat-widget__panel" aria-hidden={!isOpen}>
                <div className="chat-widget__shell">
                    {isSidebarVisible ? (
                        <ChatSidebar
                            activeConversationId={activeConversationId}
                            conversations={conversations}
                            isLoading={isLoadingConversations}
                            onSelect={handleConversationSelect}
                            onToggleSidebar={() => setIsSidebarVisible(false)}
                            t={t}
                        />
                    ) : null}

                    <div className="chat-widget__main">
                        <header className="chat-widget__chat-header">
                            {!isSidebarVisible ? (
                                <button
                                    type="button"
                                    className="chat-widget__icon-button"
                                    aria-label={t('chatWidget.showSidebar')}
                                    title={t('chatWidget.showSidebar')}
                                    onClick={() => setIsSidebarVisible(true)}
                                >
                                    <i className="fas fa-list"></i>
                                </button>
                            ) : null}
                            <span className="chat-widget__chat-avatar">
                                {activeConversation?.otherUser?.avatarUrl
                                    ? renderAvatarMedia(getAssetUrl(activeConversation.otherUser.avatarUrl), activeConversation.otherUser.username)
                                    : getAvatarFallback(activeConversation?.otherUser?.username || t('chatWidget.noChat'))}
                            </span>
                            <span className="chat-widget__chat-title">
                                <small>{t('chatWidget.activeChat')}</small>
                                <strong>{activeConversation?.otherUser?.username || t('chatWidget.noChat')}</strong>
                            </span>
                        </header>

                        <div className="chat-widget__messages">
                            {!activeConversation ? (
                                <EmptyState icon="fas fa-comments" title={t('chatWidget.emptyTitle')} text={t('chatWidget.emptyText')} />
                            ) : isLoadingMessages ? (
                                <div className="chat-widget__loading">
                                    <i className="fas fa-circle-notch fa-spin"></i>
                                    <span>{t('chatWidget.loadingMessages')}</span>
                                </div>
                            ) : activeMessages.length ? (
                                activeMessages.map((message) => (
                                    <ChatMessage
                                        key={message.id}
                                        isOwn={message.senderUserId === user?.id}
                                        message={message}
                                    />
                                ))
                            ) : (
                                <EmptyState icon="fas fa-paper-plane" title={t('chatWidget.noMessagesTitle')} text={t('chatWidget.noMessagesText')} />
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        <form className="chat-widget__composer" onSubmit={handleSubmit}>
                            <textarea
                                value={draft}
                                rows={1}
                                maxLength={4000}
                                placeholder={activeConversation ? t('chatWidget.placeholder') : t('chatWidget.chooseChat')}
                                disabled={!activeConversation || isSending}
                                onChange={(event) => setDraft(event.target.value)}
                                onKeyDown={handleDraftKeyDown}
                            />
                            <button
                                type="submit"
                                disabled={!activeConversation || !draft.trim() || isSending}
                                aria-label={t('chatWidget.send')}
                                title={t('chatWidget.send')}
                            >
                                <i className={isSending ? 'fas fa-circle-notch fa-spin' : 'fas fa-paper-plane'}></i>
                            </button>
                        </form>
                    </div>
                </div>
            </section>

            <button
                type="button"
                className={`chat-widget__trigger ${hideTrigger ? 'chat-widget__trigger--hidden' : ''}`}
                aria-expanded={isOpen}
                aria-label={isOpen ? t('chatWidget.close') : t('chatWidget.open')}
                aria-hidden={hideTrigger}
                title={isOpen ? t('chatWidget.close') : t('chatWidget.open')}
                tabIndex={hideTrigger ? -1 : 0}
                onClick={() => setIsOpen((currentValue) => !currentValue)}
            >
                {totalUnread > 0 ? <span className="chat-widget__badge">{Math.min(totalUnread, 99)}</span> : null}
                <span className="chat-widget__pulse"></span>
                <i className={isOpen ? 'fas fa-xmark' : 'fas fa-message'}></i>
            </button>
        </aside>
    )
}

const ChatSidebar = ({
    activeConversationId,
    conversations,
    isLoading,
    onSelect,
    onToggleSidebar,
    t,
}) => (
    <aside className="chat-widget__sidebar">
        <header className="chat-widget__sidebar-header">
            <span>
                <small>{t('chatWidget.eyebrow')}</small>
                <strong>{t('chatWidget.title')}</strong>
            </span>
            <button
                type="button"
                className="chat-widget__icon-button"
                aria-label={t('chatWidget.hideSidebar')}
                title={t('chatWidget.hideSidebar')}
                onClick={onToggleSidebar}
            >
                <i className="fas fa-chevron-left"></i>
            </button>
        </header>

        <div className="chat-widget__conversation-list">
            {isLoading ? (
                <div className="chat-widget__loading">
                    <i className="fas fa-circle-notch fa-spin"></i>
                    <span>{t('chatWidget.loadingChats')}</span>
                </div>
            ) : conversations.length ? conversations.map((conversation) => (
                <button
                    key={conversation.id}
                    type="button"
                    className={`chat-widget__conversation ${conversation.id === activeConversationId ? 'is-active' : ''}`}
                    onClick={() => onSelect(conversation.id)}
                >
                    <span className="chat-widget__conversation-avatar">
                        {conversation.otherUser?.avatarUrl
                            ? renderAvatarMedia(getAssetUrl(conversation.otherUser.avatarUrl), conversation.otherUser.username)
                            : getAvatarFallback(conversation.otherUser?.username)}
                    </span>
                    <span className="chat-widget__conversation-body">
                        <strong>{conversation.otherUser?.username || t('chatWidget.unknownUser')}</strong>
                        <small>{conversation.lastMessage?.text || t('chatWidget.emptyConversation')}</small>
                    </span>
                    {conversation.unreadCount > 0 ? (
                        <span className="chat-widget__conversation-badge">{Math.min(conversation.unreadCount, 99)}</span>
                    ) : null}
                </button>
            )) : (
                <EmptyState icon="fas fa-inbox" title={t('chatWidget.noChatsTitle')} text={t('chatWidget.noChatsText')} />
            )}
        </div>
    </aside>
)

const ChatMessage = ({ isOwn, message }) => (
    <article className={`chat-widget__message ${isOwn ? 'chat-widget__message--own' : ''}`}>
        <p>{message.text}</p>
        <time>{formatMessageTime(message.createdAt)}</time>
    </article>
)

const EmptyState = ({ icon, title, text }) => (
    <div className="chat-widget__empty">
        <i className={icon}></i>
        <strong>{title}</strong>
        <span>{text}</span>
    </div>
)

const formatMessageTime = (value) => {
    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return ''
    }

    return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
    })
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

const getAvatarFallback = (username = '') => String(username).trim().charAt(0).toUpperCase() || 'C'

export { CHAT_OPEN_EVENT }
export default ChatWidget
