import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLocalizedPath } from '@/i18n'
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
    const { t, i18n } = useTranslation()
    const currentLanguage = i18n.language === 'en' ? 'en' : 'ru'
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
            notify(error.message || t('supportRequests.details.messagesLoadError'), 'error')
        } finally {
            setIsMessagesLoading(false)
        }
    }, [ticketId, t])

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
                    notify(error.message || t('supportRequests.details.loadError'), 'error')
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
    }, [ticketId, t])

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
                    <div className="support-request-details-empty">{t('supportRequests.details.loading')}</div>
                </div>
            </section>
        )
    }

    if (!request) {
        return (
            <section className="section support-request-details-page">
                <div className="container support-request-details-container">
                    <div className="support-request-details-empty">{t('supportRequests.details.notFound')}</div>
                </div>
            </section>
        )
    }

    const channelKey = getStatusClassName(request.preferredChannel)

    return (
        <section className="section support-request-details-page">
            <div className="container support-request-details-container">
                <section className="support-request-details-head">
                    <GlowEffect>
                        <div className="glow-effect support-request-details-head__content">
                            <div>
                                <Link to={getLocalizedPath('/support/requests', currentLanguage)} className="support-request-details-back">
                                    <i className="fas fa-arrow-left"></i>
                                    {t('supportRequests.details.back')}
                                </Link>
                                <p className="support-request-details-eyebrow">{t('supportRequests.details.eyebrow', { id: request.id })}</p>
                                <h1>{request.title || formatCategory(request.category, t)}</h1>
                            </div>
                            <span className={`support-request-details-status support-request-details-status--${getStatusClassName(request.status)}`}>
                                {formatStatus(request.status, t)}
                            </span>
                        </div>
                    </GlowEffect>
                </section>

                <section className="support-request-details-meta">
                    <InfoCard icon="fas fa-tag" label={t('supportRequests.details.category')} value={formatCategory(request.category, t)} />
                    <InfoCard icon="fas fa-calendar" label={t('supportRequests.details.date')} value={formatDateTime(request.createdAt, currentLanguage, t)} />
                    <InfoCard icon="fas fa-comments" label={t('supportRequests.details.channel')} value={formatChannel(request.preferredChannel, t)} />
                    <InfoCard icon="fas fa-signal" label={t('supportRequests.details.status')} value={formatStatus(request.status, t)} />
                </section>

                <section className="support-request-chat">
                    <GlowEffect className='support-request-chat-glow-effect'>
                        <div className="glow-effect support-request-chat__content">
                            <div className="support-request-chat__head">
                                <div className="support-request-chat__title">
                                    <i className="fas fa-message"></i>
                                    {t('supportRequests.details.messages')}
                                </div>
                                <button type="button" className="button" onClick={loadMessages} disabled={isMessagesLoading}>
                                    <i className="fas fa-rotate"></i>
                                    {isMessagesLoading ? t('supportRequests.details.refreshing') : t('supportRequests.details.refresh')}
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
                                                <strong>{formatSender(message.senderType, message.senderLabel, t)}</strong>
                                                <time>{formatDateTime(message.createdAt, currentLanguage, t)}</time>
                                            </div>
                                            <p>{message.text}</p>
                                        </article>
                                    ))
                                ) : (
                                    <div className="support-request-details-empty">{t('supportRequests.details.emptyMessages')}</div>
                                )}
                            </div>

                            {channelKey === 'telegram' ? (
                                <div className="support-request-chat__notice">
                                    <p>{t('supportRequests.details.telegramNotice')}</p>
                                    {request.telegramUrl && (
                                        <button type="button" className="button support-request-telegram" onClick={openTelegram}>
                                            <i className="fab fa-telegram-plane"></i>
                                            {t('supportRequests.details.openTelegram')}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="support-request-chat__notice support-request-chat__notice--email">
                                    {t('supportRequests.details.emailNotice')}
                                </div>
                            )}

                            {!historySupported && channelKey !== 'email' && (
                                <div className="support-request-chat__notice">
                                    {t('supportRequests.details.historyUnavailable')}
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

const formatSender = (senderType, senderLabel, t) => {
    if (senderType === 'admin') return senderLabel || t('supportRequests.details.senderSupport')
    if (senderType === 'system') return senderLabel || t('supportRequests.details.senderSystem')

    return senderLabel || t('supportRequests.details.senderYou')
}

const getStatusClassName = (status = '') => String(status || '')
    .trim()
    .toLowerCase()
    .replaceAll('-', '_')
    .replace(/\s+/g, '_')

export default SupportRequestDetailsPage
