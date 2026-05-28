import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/i18n'
import GlowEffect from '@/shared/ui/GlowEffect'
import CustomSelect from '@/shared/ui/CustomSelect'
import TurnstileWidget from '@/shared/ui/TurnstileWidget'
import { supportAPI } from '@/shared/api/support'
import { useAuth } from '@/shared/hooks/useAuth'
import notify from '@/utils/Notifications'
import './SupportPage.css'
import supportBunner from './assets/bunner.png'

const feedbackTypes = [
    { value: 'bug', labelKey: 'support.feedbackTypes.bug', icon: 'fas fa-bug' },
    { value: 'idea', labelKey: 'support.feedbackTypes.idea', icon: 'fas fa-lightbulb' },
    { value: 'mode', labelKey: 'support.feedbackTypes.mode', icon: 'fas fa-gamepad' },
    { value: 'balance', labelKey: 'support.feedbackTypes.balance', icon: 'fas fa-balance-scale' },
    { value: 'other', labelKey: 'support.feedbackTypes.other', icon: 'fas fa-comment-dots' },
]

const supportCards = [
    {
        key: 'direct',
        icon: 'fas fa-heart',
        tone: 'pink',
    },
    {
        key: 'bugs',
        icon: 'fas fa-bug',
        tone: 'cyan',
    },
    {
        key: 'balance',
        icon: 'fas fa-balance-scale',
        tone: 'violet',
    },
]

const faqItems = [
    'rating',
    'disconnect',
    'report',
    'progress',
    'chat',
]

const contactItems = [
    {
        titleKey: 'support.contacts.telegram',
        text: '@pvptetris_support_bot',
        icon: 'fa-brands fa-telegram',
        href: 'https://t.me/pvptetris_support_bot',
    },
    {
        titleKey: 'support.contacts.email',
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
    const { lang } = useParams()
    const { t, i18n } = useTranslation()
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
    const isSupportedLanguage = SUPPORTED_LANGUAGES.includes(lang)
    const currentLanguage = isSupportedLanguage ? lang : DEFAULT_LANGUAGE
    const feedbackOptions = useMemo(() => feedbackTypes.map((type) => ({
        ...type,
        label: t(type.labelKey),
    })), [t])
    const localizedSupportCards = useMemo(() => supportCards.map((card) => ({
        ...card,
        title: t(`support.cards.${card.key}.title`),
        text: t(`support.cards.${card.key}.text`),
    })), [t])
    const localizedFaqItems = useMemo(() => faqItems.map((key) => ({
        key,
        question: t(`support.faq.${key}.question`),
        answer: t(`support.faq.${key}.answer`),
    })), [t])
    const localizedContactItems = useMemo(() => contactItems.map((item) => ({
        ...item,
        title: t(item.titleKey),
    })), [t])

    useEffect(() => {
        if (i18n.language !== currentLanguage) {
            i18n.changeLanguage(currentLanguage)
        }
    }, [currentLanguage, i18n])

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
            notify(t('support.validation.name'), 'error')
            return
        }

        if (preferredChannel === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            notify(t('support.validation.email'), 'error')
            return
        }

        if (normalizedMessage.length < 10) {
            notify(t('support.validation.message'), 'error')
            return
        }

        if (!turnstileToken) {
            notify(t('support.validation.turnstile'), 'error')
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

                notify(t('support.success.telegram'), 'success')
            } else {
                setSuccessState({
                    channel: 'email',
                    telegramUrl: '',
                })

                notify(t('support.success.email'), 'success')
            }

            setMessage('')
            setAttachmentUrl('')
            setCategory(feedbackOptions[0].value)
        } catch {
            notify(t('support.errors.submit'), 'error')
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

    if (!isSupportedLanguage) {
        return <Navigate to={`/${DEFAULT_LANGUAGE}/support`} replace />
    }

    return (
        <section className="section support-page">
            <div className="container support-container">
                <section className="support-hero-grid">
                    <section className="support-hero" style={{ '--support-bunner': `url(${supportBunner})` }}>
                        <div className="support-hero__content">
                            <p className="support-eyebrow">{t('support.hero.eyebrow')}</p>
                            <h1>{t('support.hero.title')} <span className='glow-text'>{t('support.hero.titleHighlight')}</span></h1>
                            <p>{t('support.hero.description')}</p>
                        </div>
                    </section>

                    <GlowEffect>
                        <aside className="glow-effect support-status-panel" aria-label={t('support.status.ariaLabel')}>
                            <span className="support-eyebrow"><p>{t('support.status.eyebrow')}</p></span>
                            <strong>24/7</strong>
                            <p>{t('support.status.text')}</p>
                            <small>
                                <i className="fas fa-circle-check"></i>
                                {t('support.status.note')}
                            </small>
                        </aside>
                    </GlowEffect>
                </section>

                <section className="support-help">
                    <h2>
                        <i className="fas fa-star"></i>
                        {t('support.help.title')}
                    </h2>

                    <div className="support-cards" aria-label={t('support.help.ariaLabel')}>
                        {localizedSupportCards.map((card) => (
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
                            <h2 className="support-section-title">{t('support.form.title')}</h2>
                            <form className="support-form" onSubmit={handleSupportSubmit}>
                                <fieldset disabled={isSubmitting} className="support-form__fieldset">
                                    <div>
                                        <label className="support-field">
                                            <span>{t('support.form.category')}</span>
                                            <CustomSelect
                                                name="category"
                                                value={category}
                                                options={feedbackOptions}
                                                onChange={setCategory}
                                            />
                                        </label>

                                        {!isAuth ? (
                                            <label className="support-field">
                                                <span>{t('support.form.nickname')}</span>
                                                <input
                                                    name="name"
                                                    type="text"
                                                    placeholder={t('support.form.nicknamePlaceholder')}
                                                    value={name}
                                                    onChange={(event) => setName(event.target.value)}
                                                    required
                                                />
                                            </label>
                                        ) : (
                                            <label className="support-field">
                                                <span>{t('support.form.nickname')}</span>
                                                <input name="name" type="text" value={name} disabled />
                                            </label>
                                        )}

                                        <div className="support-field support-field--wide">
                                            <span>{t('support.form.channel')}</span>
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
                                                        <small>{t('support.form.emailDescription')}</small>
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
                                                        <small>{t('support.form.telegramDescription')}</small>
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
                                            <span>{t('support.form.message')}</span>
                                            <textarea
                                                name="message"
                                                placeholder={t('support.form.messagePlaceholder')}
                                                rows="7"
                                                value={message}
                                                onChange={(event) => setMessage(event.target.value)}
                                                required
                                            ></textarea>
                                        </label>

                                        <label className="support-field support-field--wide">
                                            <span>{t('support.form.attachment')}</span>
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
                                            <span>{t('support.form.consent')}</span>
                                        </label>

                                        <button type="submit" className="button support-primary-button" disabled={isSubmitting || !turnstileToken}>
                                            <i className="fas fa-paper-plane"></i>
                                            {isSubmitting ? t('support.form.submitting') : t('support.form.submit')}
                                        </button>
                                    </div>
                                </fieldset>

                                {successState.channel === 'email' && (
                                    <div className="support-success support-success--email" role="status">
                                        {t('support.success.email')}
                                    </div>
                                )}

                                {successState.channel === 'telegram' && (
                                    <div className="support-success support-success--telegram" role="status">
                                        <p>{t('support.success.telegram')}</p>
                                        <button type="button" className="button support-telegram-button" onClick={openTelegram}>
                                            <i className="fab fa-telegram-plane"></i>
                                            {t('support.success.telegramButton')}
                                        </button>
                                        <small>{t('support.success.telegramHint')}</small>
                                    </div>
                                )}
                            </form>
                        </section>
                    </GlowEffect>

                    <aside className="support-sidebar">
                        <GlowEffect>
                            <section className="glow-effect support-panel">
                                <h2 className="support-section-title">{t('support.sidebar.faq')}</h2>
                                <div className="support-faq-list">
                                    {localizedFaqItems.map((item, index) => (
                                        <div className="support-faq-item" key={item.key}>
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
                                    {t('support.sidebar.myRequests')}
                                    <i className="fas fa-up-right-from-square"></i>
                                </Link>
                            </section>
                        </GlowEffect>

                        <GlowEffect>
                            <section className="glow-effect support-panel">
                                <h2 className="support-section-title">{t('support.sidebar.contacts')}</h2>
                                <div className="support-contact-list">
                                    {localizedContactItems.map((item) => (
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
