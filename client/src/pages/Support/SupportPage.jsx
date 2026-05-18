import { useEffect, useMemo, useState } from 'react'
import GlowEffect from '@/shared/ui/GlowEffect'
import CustomSelect from '@/shared/ui/CustomSelect'
import { supportAPI } from '@/shared/api/support'
import { useAuth } from '@/shared/hooks/useAuth'
import notify from '@/utils/Notifications'
import './SupportPage.css'

const feedbackTypes = [
    { value: 'bug', label: 'Баг или ошибка', icon: 'fas fa-bug' },
    { value: 'idea', label: 'Идея для улучшения', icon: 'fas fa-lightbulb' },
    { value: 'mode', label: 'Новый режим', icon: 'fas fa-gamepad' },
    { value: 'balance', label: 'Баланс и честность матчей', icon: 'fas fa-balance-scale' },
    { value: 'other', label: 'Другое', icon: 'fas fa-comment-dots' },
]

const supportCards = [
    {
        title: 'Баги',
        text: 'Опишите, что нажали, где это произошло и что ожидали увидеть.',
        icon: 'fas fa-bug',
    },
    {
        title: 'Идеи',
        text: 'Расскажите, какой режим, настройка или мелочь сделали бы игру лучше.',
        icon: 'fas fa-lightbulb',
    },
    {
        title: 'Баланс',
        text: 'Если матч кажется нечестным, укажите режим, соперника и что именно пошло не так.',
        icon: 'fas fa-balance-scale',
    },
]

const initialSuccessState = {
    channel: '',
    telegramUrl: '',
}

const SupportPage = () => {
    const { user, isAuth } = useAuth()
    const [category, setCategory] = useState(feedbackTypes[0].value)
    const [preferredChannel, setPreferredChannel] = useState('email')
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [attachmentUrl, setAttachmentUrl] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [successState, setSuccessState] = useState(initialSuccessState)

    const registeredName = useMemo(() => user?.username || '', [user?.username])
    const registeredEmail = useMemo(() => user?.email || '', [user?.email])

    useEffect(() => {
        if (isAuth) {
            setName(registeredName)
            setEmail(registeredEmail)
        }
    }, [isAuth, registeredEmail, registeredName])

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
                <section className="support-hero">
                    <GlowEffect>
                        <div className="glow-effect support-hero-content">
                            <div>
                                <p className="support-eyebrow">Поддержка</p>
                                <h1>Расскажите, что сломалось или чего не хватает арене</h1>
                                <p>
                                    Обращение сохранится в базе проекта и попадёт в админский раздел поддержки.
                                    Выберите, где удобнее продолжить диалог: по email или в Telegram-боте.
                                </p>
                            </div>

                            <div className="support-status-panel">
                                <span className="support-status-chip">
                                    <i className="fas fa-database"></i>
                                    Подключено к базе
                                </span>
                                <strong>24/7</strong>
                                <small>форма принимает обращения и связывает их с пользователем, если вы вошли в аккаунт</small>
                            </div>
                        </div>
                    </GlowEffect>
                </section>

                <section className="support-note">
                    <GlowEffect>
                        <div className="glow-effect support-note-content">
                            <i className="fas fa-circle-check"></i>
                            <div>
                                <h2>Пишите сразу по делу</h2>
                                <p>
                                    Для багов полезны шаги воспроизведения, ссылка на матч или скриншот.
                                    Для идей достаточно короткого описания и того, почему это сделает игру лучше.
                                </p>
                            </div>
                        </div>
                    </GlowEffect>
                </section>

                <section className="support-cards" aria-label="Типы обращений">
                    {supportCards.map((card) => (
                        <article key={card.title} className="support-card">
                            <GlowEffect>
                                <div className="glow-effect">
                                    <i className={card.icon}></i>
                                    <h2>{card.title}</h2>
                                    <p>{card.text}</p>
                                </div>
                            </GlowEffect>
                        </article>
                    ))}
                </section>

                <section className="support-form-card">
                    <GlowEffect>
                        <div className="glow-effect support-form-content">
                            <div className="support-form-copy">
                                <div className="support-section-title">
                                    <i className="fas fa-paper-plane"></i>
                                    Обратиться в поддержку
                                </div>
                                <p>
                                    Если вы авторизованы, ник и почта подставятся автоматически.
                                    При выборе Telegram сервер создаст ticket и вернёт готовую ссылку на бота.
                                </p>
                            </div>

                            <form className="support-form" onSubmit={handleSupportSubmit}>
                                <fieldset disabled={isSubmitting} className="support-form__fieldset">
                                    <label className="support-field">
                                        <span>Тема</span>
                                        <CustomSelect
                                            name="category"
                                            value={category}
                                            options={feedbackTypes}
                                            onChange={setCategory}
                                        />
                                    </label>

                                    {!isAuth ? (
                                        <label className="support-field">
                                            <span>Имя</span>
                                            <input
                                                name="name"
                                                type="text"
                                                placeholder="Например, Ivan"
                                                value={name}
                                                onChange={(event) => setName(event.target.value)}
                                                required
                                            />
                                        </label>
                                    ) : (
                                        <label className="support-field">
                                            <span>Имя</span>
                                            <input name="name" type="text" value={name} disabled />
                                        </label>
                                    )}

                                    <div className="support-field support-field--wide">
                                        <span>Предпочитаемый канал ответа</span>
                                        <div className="support-channel-options">
                                            <label className="support-channel-option">
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

                                            <label className="support-channel-option">
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

                                    <label className="support-field support-field--wide">
                                        <span>Сообщение</span>
                                        <textarea
                                            name="message"
                                            placeholder="Здравствуйте, у меня вопрос..."
                                            rows="7"
                                            value={message}
                                            onChange={(event) => setMessage(event.target.value)}
                                            required
                                        ></textarea>
                                    </label>

                                    <label className="support-field support-field--wide">
                                        <span>Ссылка на матч или скриншот</span>
                                        <input
                                            name="attachmentUrl"
                                            type="text"
                                            placeholder="https://..."
                                            value={attachmentUrl}
                                            onChange={(event) => setAttachmentUrl(event.target.value)}
                                        />
                                    </label>

                                    <button type="submit" className="button support-primary-button" disabled={isSubmitting}>
                                        <i className="fas fa-paper-plane"></i>
                                        {isSubmitting ? 'Отправляем...' : 'Отправить обращение'}
                                    </button>
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
                        </div>
                    </GlowEffect>
                </section>
            </div>
        </section>
    )
}

export default SupportPage
