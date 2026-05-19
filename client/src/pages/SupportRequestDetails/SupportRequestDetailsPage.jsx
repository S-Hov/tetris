import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import GlowEffect from '@/shared/ui/GlowEffect'
import { supportAPI } from '@/shared/api/support'
import notify from '@/utils/Notifications'
import {
    formatCategory,
    formatChannel,
    formatDateTime,
    formatStatus,
} from '@/pages/SupportRequests/supportRequestFormat.js'
import './SupportRequestDetailsPage.css'

const SupportRequestDetailsPage = () => {
    const { ticketId } = useParams()
    const [request, setRequest] = useState(null)
    const [messages, setMessages] = useState([])
    const [historySupported, setHistorySupported] = useState(true)
    const [isLoading, setIsLoading] = useState(true)
    const [isMessagesLoading, setIsMessagesLoading] = useState(false)

    const loadMessages = useCallback(async () => {
        setIsMessagesLoading(true)

        try {
            const response = await supportAPI.getMyRequestMessages(ticketId)
            setMessages(Array.isArray(response.messages) ? response.messages : [])
            setHistorySupported(response.historySupported !== false)
        } catch (error) {
            notify(error.message || 'Не удалось обновить сообщения', 'error')
        } finally {
            setIsMessagesLoading(false)
        }
    }, [ticketId])

    useEffect(() => {
        let ignore = false

        const loadDetails = async () => {
            setIsLoading(true)

            try {
                const response = await supportAPI.getMyRequest(ticketId)

                if (!ignore) {
                    setRequest(response.request)
                }
            } catch (error) {
                if (!ignore) {
                    notify(error.message || 'Не удалось загрузить обращение', 'error')
                }
            } finally {
                if (!ignore) {
                    setIsLoading(false)
                }
            }
        }

        loadDetails()

        return () => {
            ignore = true
        }
    }, [ticketId])

    useEffect(() => {
        loadMessages()
    }, [loadMessages])

    const openTelegram = () => {
        if (request?.telegramUrl) {
            window.open(request.telegramUrl, '_blank', 'noopener,noreferrer')
        }
    }

    if (isLoading) {
        return (
            <section className="section support-request-details-page">
                <div className="container support-request-details-container">
                    <div className="support-request-details-empty">Загружаем обращение...</div>
                </div>
            </section>
        )
    }

    if (!request) {
        return (
            <section className="section support-request-details-page">
                <div className="container support-request-details-container">
                    <div className="support-request-details-empty">Обращение не найдено.</div>
                </div>
            </section>
        )
    }

    return (
        <section className="section support-request-details-page">
            <div className="container support-request-details-container">
                <section className="support-request-details-head">
                    <GlowEffect>
                        <div className="glow-effect support-request-details-head__content">
                            <div>
                                <Link to="/support/requests" className="support-request-details-back">
                                    <i className="fas fa-arrow-left"></i>
                                    Все обращения
                                </Link>
                                <p className="support-request-details-eyebrow">Обращение #{request.id}</p>
                                <h1>{request.title || formatCategory(request.category)}</h1>
                            </div>
                            <span className={`support-request-details-status support-request-details-status--${request.status}`}>
                                {formatStatus(request.status)}
                            </span>
                        </div>
                    </GlowEffect>
                </section>

                <section className="support-request-details-meta">
                    <InfoCard icon="fas fa-tag" label="Категория" value={formatCategory(request.category)} />
                    <InfoCard icon="fas fa-calendar" label="Дата" value={formatDateTime(request.createdAt)} />
                    <InfoCard icon="fas fa-comments" label="Канал" value={formatChannel(request.preferredChannel)} />
                    <InfoCard icon="fas fa-signal" label="Статус" value={formatStatus(request.status)} />
                </section>

                <section className="support-request-chat">
                    <GlowEffect className='support-request-chat-glow-effect'>
                        <div className="glow-effect support-request-chat__content">
                            <div className="support-request-chat__head">
                                <div className="support-request-chat__title">
                                    <i className="fas fa-message"></i>
                                    Сообщения
                                </div>
                                <button type="button" className="button" onClick={loadMessages} disabled={isMessagesLoading}>
                                    <i className="fas fa-rotate"></i>
                                    {isMessagesLoading ? 'Обновляем...' : 'Обновить сообщения'}
                                </button>
                            </div>

                            <div className="support-request-chat__list">
                                {messages.length > 0 ? (
                                    messages.map((message) => (
                                        <article
                                            key={message.id}
                                            className={`support-request-message support-request-message--${message.senderType}`}
                                        >
                                            <div className="support-request-message__meta">
                                                <strong>{formatSender(message.senderType, message.senderLabel)}</strong>
                                                <time>{formatDateTime(message.createdAt)}</time>
                                            </div>
                                            <p>{message.text}</p>
                                        </article>
                                    ))
                                ) : (
                                    <div className="support-request-details-empty">Сообщений пока нет.</div>
                                )}
                            </div>

                            {request.preferredChannel === 'telegram' ? (
                                <div className="support-request-chat__notice">
                                    <p>
                                        Эта страница только для просмотра истории. Чтобы написать новое сообщение, продолжите диалог в Telegram-боте.
                                    </p>
                                    {request.telegramUrl && (
                                        <button type="button" className="button support-request-telegram" onClick={openTelegram}>
                                            <i className="fab fa-telegram-plane"></i>
                                            Открыть Telegram-бота
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="support-request-chat__notice support-request-chat__notice--email">
                                    История переписки для почтового канала не поддерживается. Здесь показано первое сообщение, ответ придёт на указанную почту.
                                </div>
                            )}

                            {!historySupported && request.preferredChannel !== 'email' && (
                                <div className="support-request-chat__notice">
                                    История сообщений для этого канала пока недоступна.
                                </div>
                            )}
                        </div>
                    </GlowEffect>
                </section>
            </div>
        </section>
    )
}

const InfoCard = ({ icon, label, value }) => (
    <GlowEffect className='support-request-info-card-glow-effect'>
        <article className="glow-effect support-request-info-card">
            <i className={icon}></i>
            <span>{label}</span>
            <strong>{value}</strong>
        </article>
    </GlowEffect>
)

const formatSender = (senderType, senderLabel) => {
    if (senderType === 'admin') return senderLabel || 'Поддержка'
    if (senderType === 'system') return senderLabel || 'Система'

    return senderLabel || 'Вы'
}

export default SupportRequestDetailsPage
