import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GlowEffect from '@/shared/ui/GlowEffect'
import { supportAPI } from '@/shared/api/support'
import notify from '@/utils/Notifications'
import {
    formatCategory,
    formatChannel,
    formatDateTime,
    formatStatus,
} from './supportRequestFormat.js'
import './SupportRequestsPage.css'

const SupportRequestsPage = () => {
    const [requests, setRequests] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let ignore = false

        const loadRequests = async () => {
            setIsLoading(true)

            try {
                const response = await supportAPI.getMyRequests()

                if (!ignore) {
                    setRequests(Array.isArray(response.requests) ? response.requests : [])
                }
            } catch (error) {
                if (!ignore) {
                    notify(error.message || 'Не удалось загрузить обращения', 'error')
                }
            } finally {
                if (!ignore) {
                    setIsLoading(false)
                }
            }
        }

        loadRequests()

        return () => {
            ignore = true
        }
    }, [])

    return (
        <section className="section support-requests-page">
            <div className="container support-requests-container">
                <section className="support-requests-head">
                    <GlowEffect>
                        <div className="glow-effect support-requests-head__content">
                            <div>
                                <p className="support-requests-eyebrow">Поддержка</p>
                                <h1>Мои обращения</h1>
                                <p>Здесь собраны обращения, которые вы отправляли из формы поддержки.</p>
                            </div>
                            <div>
                                <Link to="/support" className="button support-requests-action">
                                    <i className="fas fa-paper-plane"></i>
                                    Новое обращение
                                </Link>
                            </div>
                        </div>
                    </GlowEffect>
                </section>

                <section className="support-requests-list" aria-label="Список обращений">
                    {isLoading ? (
                        <div className="support-requests-empty">Загружаем обращения...</div>
                    ) : requests.length > 0 ? (
                        requests.map((request) => (
                            <Link
                                key={request.id}
                                to={`/support/requests/${request.id}`}
                                className="support-request-item"
                            >
                                <GlowEffect className='support-request-item-glow-effect'>
                                    <article className="glow-effect support-request-item__content">
                                        <div className="support-request-item__main">
                                            <span className="support-request-item__meta">
                                                {formatDateTime(request.createdAt)} · {formatChannel(request.preferredChannel)}
                                            </span>
                                            <h2>{request.title || formatCategory(request.category)}</h2>
                                            <p>{request.message}</p>
                                        </div>
                                        <div className="support-request-item__side">
                                            <span className={`support-request-status support-request-status--${request.status}`}>
                                                {formatStatus(request.status)}
                                            </span>
                                            <small>{formatCategory(request.category)}</small>
                                        </div>
                                    </article>
                                </GlowEffect>
                            </Link>
                        ))
                    ) : (
                        <div className="support-requests-empty">
                            Обращений пока нет. Если заметите ошибку или появится идея, напишите нам.
                        </div>
                    )}
                </section>
            </div>
        </section>
    )
}

export default SupportRequestsPage
