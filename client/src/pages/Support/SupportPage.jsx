import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import GlowEffect from '@/shared/ui/GlowEffect'
import CustomSelect from '@/shared/ui/CustomSelect'
import TurnstileWidget from '@/shared/ui/TurnstileWidget'
import { supportAPI } from '@/shared/api/support'
import { useAuth } from '@/shared/hooks/useAuth'
import notify from '@/utils/Notifications'
import './SupportPage.css'
import supportBunner from './assets/bunner.png'

const feedbackTypes = [
    { value: 'bug', label: 'Баг или ошибка', icon: 'fas fa-bug' },
    { value: 'idea', label: 'Идея для улучшения', icon: 'fas fa-lightbulb' },
    { value: 'mode', label: 'Новый режим', icon: 'fas fa-gamepad' },
    { value: 'balance', label: 'Баланс и честность матчей', icon: 'fas fa-balance-scale' },
    { value: 'other', label: 'Другое', icon: 'fas fa-comment-dots' },
]

const supportCards = [
    {
        title: 'Пишите сразу по делу',
        text: 'Для более быстрого решения опишите суть проблемы и укажите детали: режим, ник, время и т.д.',
        icon: 'fas fa-heart',
        tone: 'pink',
    },
    {
        title: 'Баги и ошибки',
        text: 'Опишите, что произошло и что ожидали увидеть. Приложите скриншоты или видео, если есть.',
        icon: 'fas fa-bug',
        tone: 'cyan',
    },
    {
        title: 'Баланс и режимы',
        text: 'Укажите, какой режим или баланс кажется нечестным и что можно улучшить.',
        icon: 'fas fa-balance-scale',
        tone: 'violet',
    },
]

const faqItems = [
    {
        question: 'Как работает система рейтинга?',
        answer: 'Рейтинг меняется после завершённых матчей и зависит от режима, результата и силы соперников.',
    },
    {
        question: 'Что делать при вылете из матча?',
        answer: 'Укажите режим, примерное время, ник и ссылку на матч, если она есть. Так мы быстрее найдём сессию.',
    },
    {
        question: 'Как сообщить о нарушителе?',
        answer: 'Создайте обращение с категорией "Другое" или "Баланс" и приложите ссылку на матч или скриншот.',
    },
    {
        question: 'Как вернуть потерянный прогресс?',
        answer: 'Напишите ник, email аккаунта и опишите, после какого действия пропал прогресс.',
    },
    {
        question: 'Есть ли ограничения в чатах?',
        answer: 'Да. Оскорбления, спам и попытки обхода правил могут привести к ограничениям аккаунта.',
    },
]

const contactItems = [
    {
        title: 'Telegram-Бот',
        text: '@pvptetris_support_bot',
        icon: 'fa-brands fa-telegram',
        href: 'https://t.me/pvptetris_support_bot',
    },
    {
        title: 'Email',
        text: 'support@pvptetris.com',
        icon: 'fa-solid fa-envelope',
        href: 'mailto:support@pvptetris.com',
    },
]

const initialSuccessState = {
    channel: '',
    telegramUrl: '',
}

const SupportPage = () => {
    const { user, isAuth } = useAuth()
    const [category, setCategory] = useState(feedbackTypes[0].value)
    const [preferredChannel, setPreferredChannel] = useState('telegram')
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [attachmentUrl, setAttachmentUrl] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successState, setSuccessState] = useState(initialSuccessState)
    const [turnstileToken, setTurnstileToken] = useState('')
    const [turnstileResetSignal, setTurnstileResetSignal] = useState(0)
    const [activeFaq, setActiveFaq] = useState(0)

    const registeredName = useMemo(() => user?.username || '', [user?.username])
    const registeredEmail = useMemo(() => user?.email || '', [user?.email])

    useEffect(() => {
        if (isAuth) {
            setName(registeredName)
            setEmail(registeredEmail)
        }
    }, [isAuth, registeredEmail, registeredName])

    const handleTurnstileTokenChange = useCallback((token) => {
        setTurnstileToken(token)
    }, [])

    const resetTurnstile = () => {
        setTurnstileToken('')
        setTurnstileResetSignal((value) => value + 1)
    }

    const handleSupportSubmit = async (event) => {
        event.preventDefault()

        const normalizedName = String(name || '').trim()
        const normalizedEmail = String(email || '').trim()
        const normalizedMessage = String(message || '').trim()

        if (!normalizedName) {
            notify('Укажите имя, чтобы поддержка знала, как к вам обратиться.', 'error')
            return
        }

        if (preferredChannel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            notify('Введите корректный email для ответа.', 'error')
            return
        }

        if (normalizedMessage.length < 10) {
            notify('Сообщение должно быть не короче 10 символов.', 'error')
            return
        }

        if (!turnstileToken) {
            notify('Проверка безопасности не пройдена', 'error')
            return
        }

        setIsSubmitting(true)
        setSuccessState(initialSuccessState)

        try {
            const payload = {
                name: normalizedName,
                message: normalizedMessage,
                preferredChannel,
                category,
                attachmentUrl,
                pageUrl: window.location.href,
                clientContext: {
                    language: navigator.language,
                    viewport: `${window.innerWidth}x${window.innerHeight}`,
                },
                turnstileToken,
            }

            if (preferredChannel === 'email') {
                payload.email = normalizedEmail
            }

            const response = await supportAPI.createFeedback(payload)

            if (preferredChannel === 'telegram') {
                setSuccessState({
                    channel: 'telegram',
                    telegramUrl: response.telegramUrl || '',
                })

                if (response.telegramUrl) {
                    window.open(response.telegramUrl, '_blank', 'noopener,noreferrer')
                }

                notify('Спасибо! Теперь откройте Telegram, чтобы продолжить диалог с поддержкой.', 'success')
            } else {
                setSuccessState({
                    channel: 'email',
                    telegramUrl: '',
                })

                notify('Спасибо! Ваше сообщение отправлено. Мы ответим вам на email.', 'success')
            }

            setMessage('')
            setAttachmentUrl('')
            setCategory(feedbackTypes[0].value)
        } catch {
            notify('Не удалось отправить сообщение. Попробуйте ещё раз.', 'error')
            resetTurnstile()
        } finally {
            setIsSubmitting(false)
        }
    }

    const openTelegram = () => {
        if (successState.telegramUrl) {
            window.open(successState.telegramUrl, '_blank', 'noopener,noreferrer')
        }
    }

    return (
        <section className="section support-page">
            <div className="container support-container">
                <section className="support-hero-grid">
                    <section className="support-hero" style={{ '--support-bunner': `url(${supportBunner})` }}>
                        <div className="support-hero__content">
                            <p className="support-eyebrow">Поддержка</p>
                            <h1>Чем мы можем вам <span className='glow-text'>помочь?</span></h1>
                            <p>
                                Обращение сохранится в базе проекта и попадёт в админский раздел поддержки.
                                Выберите, где удобнее продолжить диалог: по email или в Telegram-боте.
                            </p>
                        </div>
                    </section>

                    <GlowEffect>
                        <aside className="glow-effect support-status-panel" aria-label="Время работы поддержки">
                            <span className="support-eyebrow"><p>Мы на связи</p></span>
                            <strong>24/7</strong>
                            <p>Наша команда поддержки старается отвечать как можно быстрее</p>
                            <small>
                                <i className="fas fa-circle-check"></i>
                                Форма принимает обращения 24/7
                            </small>
                        </aside>
                    </GlowEffect>
                </section>

                <section className="support-help">
                    <h2>
                        <i className="fas fa-star"></i>
                        Полезно знать
                    </h2>

                    <div className="support-cards" aria-label="Типы обращений">
                        {supportCards.map((card) => (
                            <GlowEffect key={card.title}>
                                <article className={`glow-effect support-card support-card--${card.tone}`}>
                                    <i className={card.icon}></i>
                                    <div>
                                        <h3>{card.title}</h3>
                                        <p>{card.text}</p>
                                    </div>
                                </article>
                            </GlowEffect>
                        ))}
                    </div>
                </section>

                <section className="support-main-grid">
                    <GlowEffect>
                        <section className="glow-effect support-form-card">
                            <h2 className="support-section-title">Создать обращение</h2>
                            <form className="support-form" onSubmit={handleSupportSubmit}>
                                <fieldset disabled={isSubmitting} className="support-form__fieldset">
                                    <div>
                                        <label className="support-field">
                                            <span>Тема обращения</span>
                                            <CustomSelect
                                                name="category"
                                                value={category}
                                                options={feedbackTypes}
                                                onChange={setCategory}
                                            />
                                        </label>

                                        {!isAuth ? (
                                            <label className="support-field">
                                                <span>Ваш игровой ник</span>
                                                <input
                                                    name="name"
                                                    type="text"
                                                    placeholder="Введите ваш никнейм"
                                                    value={name}
                                                    onChange={(event) => setName(event.target.value)}
                                                    required
                                                />
                                            </label>
                                        ) : (
                                            <label className="support-field">
                                                <span>Ваш игровой ник</span>
                                                <input name="name" type="text" value={name} disabled />
                                            </label>
                                        )}

                                        <div className="support-field support-field--wide">
                                            <span>Предпочитаемый канал ответа</span>
                                            <div className="support-channel-options">
                                                <label className="support-channel-option" style={{ order: 2 }}>
                                                    <input
                                                        type="radio"
                                                        name="preferredChannel"
                                                        value="email"
                                                        checked={preferredChannel === 'email'}
                                                        onChange={() => setPreferredChannel('email')}
                                                    />
                                                    <span>
                                                        <strong><i className="fa-solid fa-envelope"></i> Email</strong>
                                                        <small>Ответ придёт вам на почту. Дальнейшее общение продолжим там</small>
                                                    </span>
                                                </label>

                                                <label className="support-channel-option" style={{ order: 1 }}>
                                                    <input
                                                        type="radio"
                                                        name="preferredChannel"
                                                        value="telegram"
                                                        checked={preferredChannel === 'telegram'}
                                                        onChange={() => setPreferredChannel('telegram')}
                                                    />
                                                    <span>
                                                        <strong><i className="fa-brands fa-telegram"></i> Telegram</strong>
                                                        <small>Мы перенаправим вас в Telegram-бота, где вы сможете продолжить переписку.</small>
                                                    </span>
                                                </label>
                                            </div>
                                        </div>

                                        {preferredChannel === 'email' && (
                                            <label className="support-field support-field--wide">
                                                <span>Email</span>
                                                <input
                                                    name="email"
                                                    type="email"
                                                    placeholder="ivan@example.com"
                                                    value={email}
                                                    onChange={(event) => setEmail(event.target.value)}
                                                    required
                                                />
                                            </label>
                                        )}
                                    </div>
                                    <div>
                                        <label className="support-field support-field--wide">
                                            <span>Описание проблемы</span>
                                            <textarea
                                                name="message"
                                                placeholder="Опишите ситуацию как можно подробнее... Что произошло? Где? Когда?"
                                                rows="7"
                                                value={message}
                                                onChange={(event) => setMessage(event.target.value)}
                                                required
                                            ></textarea>
                                        </label>

                                        <label className="support-field support-field--wide">
                                            <span>Ссылка на матч или скриншот (необязательно)</span>
                                            <input
                                                name="attachmentUrl"
                                                type="text"
                                                placeholder="https://..."
                                                value={attachmentUrl}
                                                onChange={(event) => setAttachmentUrl(event.target.value)}
                                            />
                                        </label>

                                        <TurnstileWidget onTokenChange={handleTurnstileTokenChange} resetSignal={turnstileResetSignal} />

                                        <label className="support-consent support-field--wide">
                                            <input type="checkbox" required />
                                            <span>Я подтверждаю, что ознакомился с правилами проекта и даю согласие на обработку моих данных.</span>
                                        </label>

                                        <button type="submit" className="button support-primary-button" disabled={isSubmitting || !turnstileToken}>
                                            <i className="fas fa-paper-plane"></i>
                                            {isSubmitting ? 'Отправляем...' : 'Отправить обращение'}
                                        </button>
                                    </div>
                                </fieldset>

                                {successState.channel === 'email' && (
                                    <div className="support-success support-success--email" role="status">
                                        Спасибо! Ваше сообщение отправлено. Мы ответим вам на email.
                                    </div>
                                )}

                                {successState.channel === 'telegram' && (
                                    <div className="support-success support-success--telegram" role="status">
                                        <p>Спасибо! Теперь откройте Telegram, чтобы продолжить диалог с поддержкой.</p>
                                        <button type="button" className="button support-telegram-button" onClick={openTelegram}>
                                            <i className="fab fa-telegram-plane"></i>
                                            Продолжить в Telegram
                                        </button>
                                        <small>Если Telegram не открылся автоматически, нажмите кнопку выше.</small>
                                    </div>
                                )}
                            </form>
                        </section>
                    </GlowEffect>

                    <aside className="support-sidebar">
                        <GlowEffect>
                            <section className="glow-effect support-panel">
                                <h2 className="support-section-title">Частые вопросы</h2>
                                <div className="support-faq-list">
                                    {faqItems.map((item, index) => (
                                        <div className="support-faq-item" key={item.question}>
                                            <button
                                                type="button"
                                                className="support-faq-link"
                                                aria-expanded={activeFaq === index}
                                                onClick={() => setActiveFaq(activeFaq === index ? -1 : index)}
                                            >
                                                <span>{item.question}</span>
                                                <i className="fas fa-chevron-right"></i>
                                            </button>
                                            {activeFaq === index ? (
                                                <p>{item.answer}</p>
                                            ) : null}
                                        </div>
                                    ))}
                                </div>
                                <Link to="/support/requests" className="support-outline-button">
                                    Мои обращения
                                    <i className="fas fa-up-right-from-square"></i>
                                </Link>
                            </section>
                        </GlowEffect>

                        <GlowEffect>
                            <section className="glow-effect support-panel">
                                <h2 className="support-section-title">Другие способы связи</h2>
                                <div className="support-contact-list">
                                    {contactItems.map((item) => (
                                        <a className="support-contact-link" href={item.href} key={item.title} target={item.href.startsWith('http') ? '_blank' : undefined} rel={item.href.startsWith('http') ? 'noreferrer' : undefined}>
                                            <i className={item.icon}></i>
                                            <span>
                                                <strong>{item.title}</strong>
                                                <small>{item.text}</small>
                                            </span>
                                            <i className="fas fa-chevron-right"></i>
                                        </a>
                                    ))}
                                </div>
                            </section>
                        </GlowEffect>
                    </aside>
                </section>
            </div>
        </section>
    )
}

export default SupportPage
