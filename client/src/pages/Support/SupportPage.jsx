import { useState } from 'react'
import GlowEffect from '@/shared/ui/GlowEffect'
import CustomSelect from '@/shared/ui/CustomSelect'
import { supportAPI } from '@/shared/api/support'
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
        text: 'Если матч кажется нечестным, важно понять почему: скорость, мусор, подбор или правила.',
        icon: 'fas fa-balance-scale',
    },
]

const SupportPage = () => {
    const [category, setCategory] = useState(feedbackTypes[0].value)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSupportSubmit = async (event) => {
        event.preventDefault()

        const form = event.currentTarget
        const formData = new FormData(form)
        const contact = String(formData.get('contact') || '').trim()
        const message = String(formData.get('message') || '').trim()

        setIsSubmitting(true)

        try {
            await supportAPI.createRequest({
                category,
                contactName: contact.includes('@') ? '' : contact,
                contactEmail: contact.includes('@') ? contact : '',
                message,
                attachmentUrl: formData.get('attachmentUrl'),
                pageUrl: window.location.href,
                clientContext: {
                    language: navigator.language,
                    viewport: `${window.innerWidth}x${window.innerHeight}`,
                },
            })

            form.reset()
            setCategory(feedbackTypes[0].value)
            notify('Обращение отправлено. Спасибо, что помогаете проекту!', 'success')
        } catch (error) {
            notify(error.message || 'Не удалось отправить обращение', 'error')
        } finally {
            setIsSubmitting(false)
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
                                    Сообщения из формы сохраняются в базе проекта и попадают в админский раздел поддержки.
                                    Чем конкретнее описание, тем быстрее получится разобраться с багом, балансом или новой идеей.
                                </p>
                            </div>

                            <div className="support-status-panel">
                                <span className="support-status-chip">
                                    <i className="fas fa-database"></i>
                                    Подключено к базе
                                </span>
                                <strong>24/7</strong>
                                <small>форма принимает обращения и сохраняет их для админки</small>
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
                                    Для багов полезны шаги воспроизведения, ссылка на матч или скриншот. Для идей хватит
                                    короткого описания и того, почему это сделает игру лучше.
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
                    <div>
                    <GlowEffect>
                        <div className="glow-effect support-form-content">
                            <div className="support-form-copy">
                                <div className="support-section-title">
                                    <i className="fas fa-paper-plane"></i>
                                    Сообщить о проблеме или идее
                                </div>
                                <p>
                                    Пишите живым языком: что сломалось, что бесит, чего не хватает, какой режим хочется
                                    увидеть. Короткие конкретные сообщения будут
                                    помогать сильнее всего.
                                </p>
                            </div>

                            <form className="support-form" onSubmit={handleSupportSubmit}>
                                <label className="support-field">
                                    <span>Тема</span>
                                    <CustomSelect
                                        name="category"
                                        value={category}
                                        options={feedbackTypes}
                                        onChange={setCategory}
                                    />
                                </label>

                                <label className="support-field">
                                    <span>Ваш ник или email</span>
                                    <input name="contact" type="text" placeholder="Например, NeonStack" />
                                </label>

                                <label className="support-field support-field--wide">
                                    <span>Что произошло или что добавить</span>
                                    <textarea name="message" placeholder="Опишите ситуацию, шаги, ожидание и результат..." rows="7" required></textarea>
                                </label>

                                <label className="support-field support-field--wide">
                                    <span>Ссылка на матч или скриншот</span>
                                    <input name="attachmentUrl" type="text" placeholder="https://..." />
                                </label>

                                <button type="submit" className="button support-primary-button" disabled={isSubmitting}>
                                    <i className="fas fa-paper-plane"></i>
                                    {isSubmitting ? 'Отправляем...' : 'Отправить обращение'}
                                </button>
                            </form>
                        </div>
                    </GlowEffect>

                    </div>
                </section>

            </div>
        </section>
    )
}

export default SupportPage
