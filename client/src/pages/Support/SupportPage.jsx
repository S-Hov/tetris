import { Link } from 'react-router-dom'
import GlowEffect from '@/shared/ui/GlowEffect'
import CustomSelect from '@/shared/ui/CustomSelect'
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
    const handleSupportSubmit = (event) => {
        event.preventDefault()
    }

    return (
        <section className="section support-page">
            <div className="container support-container">
                <section className="support-hero">
                    <GlowEffect>
                        <div className="glow-effect support-hero-content">
                            <div>
                                <p className="support-eyebrow">Поддержка</p>
                                <h1>Это пока честная заглушка, а не волшебная кнопка спасения</h1>
                                <p>
                                    Страница поддержки уже выглядит как часть сайта, но настоящей отправки обращений
                                    пока нет. Мы не хотим делать вид, что ваши сообщения улетают в идеальную службу
                                    заботы о пользователях. Сейчас это макет: форму можно заполнить, но без бекенда
                                    она никуда не отправится.
                                </p>
                            </div>

                            <div className="support-status-panel">
                                <span className="support-status-chip">
                                    <i className="fas fa-tools"></i>
                                    Макет без бекенда
                                </span>
                                <strong>0</strong>
                                <small>обращений будет реально сохранено сейчас</small>
                            </div>
                        </div>
                    </GlowEffect>
                </section>

                <section className="support-note">
                    <GlowEffect>
                        <div className="glow-effect support-note-content">
                            <i className="fas fa-exclamation-circle"></i>
                            <div>
                                <h2>Главное: мы вас не обманываем</h2>
                                <p>
                                    Кнопка ниже пока не связывается с сервером. Когда появится бекенд, здесь будет
                                    нормальная отправка багрепортов, идей и пожеланий автору проекта.
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
                                    увидеть. Даже когда форма станет рабочей, короткие конкретные сообщения будут
                                    помогать сильнее всего.
                                </p>
                            </div>

                            <form className="support-form" onSubmit={handleSupportSubmit}>
                                <label className="support-field">
                                    <span>Тема</span>
                                    <CustomSelect
                                        name="category"
                                        defaultValue={feedbackTypes[0].value}
                                        options={feedbackTypes}
                                    />
                                </label>

                                <label className="support-field">
                                    <span>Ваш ник или email</span>
                                    <input type="text" placeholder="Например, NeonStack" />
                                </label>

                                <label className="support-field support-field--wide">
                                    <span>Что произошло или что добавить</span>
                                    <textarea placeholder="Опишите ситуацию, шаги, ожидание и результат..." rows="7"></textarea>
                                </label>

                                <label className="support-field support-field--wide">
                                    <span>Ссылка на матч или скриншот</span>
                                    <input type="text" placeholder="Пока просто текстовое поле без загрузки файлов" />
                                </label>

                                <button type="submit" className="button support-primary-button">
                                    <i className="fas fa-lock"></i>
                                    Пока не отправлять
                                </button>
                            </form>
                        </div>
                    </GlowEffect>

                    </div>
                </section>

                <footer className="support-footer">
                    <span>Настоящая поддержка появится после подключения бекенда.</span>
                    <nav>
                        <Link to="/">Главная</Link>
                        <Link to="/about">О нас</Link>
                        <Link to="/rating">Рейтинг</Link>
                    </nav>
                </footer>
            </div>
        </section>
    )
}

export default SupportPage
