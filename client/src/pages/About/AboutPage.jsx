import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import GlowEffect from '@/shared/ui/GlowEffect'
import CustomSelect from '@/shared/ui/CustomSelect'
import TurnstileWidget from '@/shared/ui/TurnstileWidget'
import { supportAPI } from '@/shared/api/support'
import { useAuth } from '@/shared/hooks/useAuth'
import notify from '@/utils/Notifications'
import aboutHeroImage from './assets/bunner/about-hero.png'
import gameDevImage from './assets/bunner/game_dev.png'
import seasonOneImage from './assets/seasons/season_1.png'
import seasonTwoImage from './assets/seasons/season_2.png'
import seasonThreeImage from './assets/seasons/season_3.png'
import seasonFourImage from './assets/seasons/season_4.png'
import './AboutPage.css'

const featureCards = [
    {
        title: 'PvP бои',
        icon: 'fas fa-gamepad',
        items: ['Атаки линиями', 'Дебаффы', 'Контроль темпа', 'Никакого рандома без твоего ответа'],
    },
    {
        title: 'Режимы',
        icon: 'fas fa-users',
        items: ['1v1', '2v2', '5v5', 'Royale'],
        note: 'Выбирай свой стиль и побеждай.',
    },
    {
        title: 'Система эффектов',
        icon: 'fas fa-bolt',
        items: ['Инверсия поля', 'Слепые зоны', 'Ускорение', 'Нестандартные фигуры'],
        note: 'Каждая партия - новый вызов.',
    },
    {
        title: 'Без pay-to-win',
        icon: 'fa-solid fa-shield',
        items: ['Никаких преимуществ за донат.', 'Только скилл, реакция и стратегия.'],
        note: 'Честная арена для каждого',
    },
]

const seasons = [
    {
        title: 'Сезон 1',
        status: 'done',
        image: seasonOneImage,
        items: ['PvP ядро', 'Рейтинг', 'Личный кабинет', 'Система эффектов'],
    },
    {
        title: 'Сезон 2',
        image: seasonTwoImage,
        items: ['Турниры', 'Spectator mode', 'Replay система', 'Достижения'],
    },
    {
        title: 'Сезон 3',
        image: seasonThreeImage,
        items: ['Кастомные эффекты', 'Battle Pass', 'Ranked divisions', 'Глобальные таблицы'],
    },
    {
        title: 'Сезон 4+',
        image: seasonFourImage,
        items: ['Свои лиги и ивенты', 'API и моддинг', 'Мобильное приложение', 'И многое другое...'],
    },
]

const projectStats = [
    { value: '24/7', label: 'Арена онлайн', icon: 'fas fa-users' },
    { value: '100+', label: 'Матчей сыграно', icon: 'fas fa-gamepad' },
    { value: '?', label: 'Среднее время поиска', icon: 'fas fa-clock-rotate-left' },
    { value: '0$', label: 'Pay to win', icon: 'fas fa-crown' },
    { value: '100%', label: 'Честный геймплей', icon: 'fas fa-trophy' },
]

const AboutPage = () => {
    const location = useLocation()
    const { isAuth, user } = useAuth()
    const [donationWallets, setDonationWallets] = useState([])
    const [selectedWalletId, setSelectedWalletId] = useState('')
    const [isAnonymousDonation, setIsAnonymousDonation] = useState(false)
    const [isQrOpen, setIsQrOpen] = useState(false)
    const [isWalletsLoading, setIsWalletsLoading] = useState(true)
    const [isDonationSubmitting, setIsDonationSubmitting] = useState(false)
    const [turnstileToken, setTurnstileToken] = useState('')
    const [turnstileResetSignal, setTurnstileResetSignal] = useState(0)
    const selectedWallet = donationWallets.find((wallet) => String(wallet.id) === String(selectedWalletId)) || donationWallets[0]
    const cryptoOptions = donationWallets.map((wallet) => ({
        value: String(wallet.id),
        label: wallet.addressLabel || `${wallet.currencyCode} в сети ${wallet.networkName}`,
        description: `${wallet.currencyName || wallet.currencyCode} | ${wallet.networkName}`,
        iconImage: wallet.currencyIconUrl || wallet.networkIconUrl,
        iconText: wallet.currencyIconSymbol || wallet.networkIconSymbol || wallet.currencyCode?.slice(0, 2),
    }))

    useEffect(() => {
        if (!location.hash) {
            return
        }

        const target = document.querySelector(location.hash)
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [location.hash])

    useEffect(() => {
        let ignore = false

        const loadWallets = async () => {
            setIsWalletsLoading(true)

            try {
                const response = await supportAPI.getDonationWallets()
                const wallets = Array.isArray(response.wallets) ? response.wallets : []

                if (!ignore) {
                    setDonationWallets(wallets)
                    setSelectedWalletId(wallets[0] ? String(wallets[0].id) : '')
                }
            } catch (error) {
                if (!ignore) {
                    notify(error.message || 'Не удалось загрузить кошельки для донатов', 'error')
                }
            } finally {
                if (!ignore) {
                    setIsWalletsLoading(false)
                }
            }
        }

        loadWallets()

        return () => {
            ignore = true
        }
    }, [])

    const handleTurnstileTokenChange = useCallback((token) => {
        setTurnstileToken(token)
    }, [])

    const resetTurnstile = () => {
        setTurnstileToken('')
        setTurnstileResetSignal((value) => value + 1)
    }

    const handleDonateSubmit = async (event) => {
        event.preventDefault()

        if (!selectedWallet) {
            notify('Сейчас нет активного кошелька для доната', 'error')
            return
        }

        if (!turnstileToken) {
            notify('Проверка безопасности не пройдена', 'error')
            return
        }

        const form = event.currentTarget
        const formData = new FormData(form)

        setIsDonationSubmitting(true)

        try {
            await supportAPI.createDonation({
                walletId: selectedWallet.id,
                isAnonymous: !isAuth || isAnonymousDonation,
                expectedAmount: formData.get('expectedAmount'),
                donorName: formData.get('donorName') || (isAuth && !isAnonymousDonation ? user?.username : ''),
                note: formData.get('note'),
                turnstileToken,
            })

            form.reset()
            notify('Донат создан. Спасибо за поддержку!', 'success')
        } catch (error) {
            notify(error.message || 'Не удалось создать донат', 'error')
            resetTurnstile()
        } finally {
            setIsDonationSubmitting(false)
        }
    }

    const handleCopyAddress = async () => {
        if (!selectedWallet?.address) {
            notify('Адрес кошелька пока не выбран', 'error')
            return
        }

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(selectedWallet.address)
            } else {
                const input = document.createElement('input')
                input.value = selectedWallet.address
                input.setAttribute('readonly', 'readonly')
                input.style.position = 'fixed'
                input.style.opacity = '0'
                document.body.appendChild(input)
                input.select()
                document.execCommand('copy')
                document.body.removeChild(input)
            }

            notify('Адрес скопирован', 'success')
        } catch {
            notify('Не удалось скопировать адрес', 'error')
        }
    }

    return (
        <section className="section about-page">
            <div className="container about-container">
                <section className="about-hero">
                    <div className="about-hero__background" aria-hidden="true">
                        <img src={aboutHeroImage} alt="" />
                    </div>
                    <div className="about-hero__copy">
                        <p className="about-kicker">О проекте</p>
                        <h1>PvP Tetris - это не просто тетрис.</h1>
                        <p className="about-hero__lead glow-text">Это PvP-арена на скорости реакции.</p>
                        <p>
                            Мы объединили классический геймплей Тетриса с динамичными PvP-битвами, уникальными механиками и эффектами,
                            чтобы каждая партия была непредсказуемой и захватывающей.
                        </p>
                        <div className="about-hero__actions">
                            <Link to="/game/1v1" className="button about-button about-button--primary">
                                <i className="fas fa-play"></i>
                                Играть сейчас
                            </Link>
                            <Link to="/support" className="button about-button about-button--ghost">
                                <i className="fas fa-headset"></i>
                                Поддержка
                            </Link>
                        </div>
                    </div>
                </section>

                <section className="about-block" aria-labelledby="about-features-title">
                    <h2 className="about-block__title" id="about-features-title">Что делает игру особенной</h2>
                    <div className="about-features">
                        {featureCards.map((feature) => (
                            <article className="about-feature-card" key={feature.title}>
                                <GlowEffect>
                                    <div className="glow-effect about-feature-card__inner">
                                        <i className={feature.icon}></i>
                                        <div>
                                            <h3>{feature.title}</h3>
                                            <ul>
                                                {feature.items.map((item) => (
                                                    <li key={item}>{item}</li>
                                                ))}
                                            </ul>
                                            {feature.note ? <p>{feature.note}</p> : null}
                                        </div>
                                    </div>
                                </GlowEffect>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="about-block" aria-labelledby="about-seasons-title">
                    <h2 className="about-block__title" id="about-seasons-title">Будущие арены</h2>
                    <div className="about-seasons">
                        {seasons.map((season) => (
                            <article className="about-season-card" key={season.title}>
                                <img src={season.image} alt={season.title} />
                                <div className="about-season-card__content">
                                    <div className="about-season-card__head">
                                        <h3>{season.title}</h3>
                                        <span>
                                            <i className={season.status === 'done' ? 'fas fa-check' : 'fas fa-circle'}></i>
                                        </span>
                                    </div>
                                    <ul>
                                        {season.items.map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                </div>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="about-block" aria-labelledby="about-stats-title">
                    <h2 className="about-block__title" id="about-stats-title">Наши цифры</h2>
                    <div className="about-stats">
                        {projectStats.map((stat) => (
                            <article className="about-stat-card" key={stat.label}>
                                <GlowEffect>
                                    <div className="glow-effect about-stat-card__inner">
                                        <i className={stat.icon}></i>
                                        <strong>{stat.value}</strong>
                                        <span>{stat.label}</span>
                                    </div>
                                </GlowEffect>
                            </article>
                        ))}
                    </div>
                </section>

                <section className="about-support-grid" id="donate">
                    <article className="about-dev-card">
                        <img src={gameDevImage} alt="" />
                        <div className="about-dev-card__content">
                            <p className="about-kicker">Кто делает игру</p>
                            <h2>Один разработчик. Одна идея. Сделать тетрис снова адреналиновым.</h2>
                            <p>
                                Проект делает студент и инди-разработчик. Я собираю эту арену один, с любовью к игре и сообществу.
                                Спасибо, что вы с нами!
                            </p>
                            <Link className="button about-button about-button--primary" to="/support">
                                Узнать больше
                            </Link>
                        </div>
                    </article>

                    <section className="about-donate-card">
                        <GlowEffect className="about-donate-card-glow">
                            <div className="glow-effect about-donate-content">
                                <form className="about-donate-form" onSubmit={handleDonateSubmit}>
                                    <div className="about-donate-form__head">
                                        <p className="about-kicker">Поддержать проект</p>
                                        <p>Донаты помогают содержать серверы, развивать проект и делать арену лучше.</p>
                                    </div>

                                    <label className="about-field">
                                        <span>Валюта</span>
                                        <CustomSelect
                                            name="walletId"
                                            value={selectedWalletId}
                                            options={cryptoOptions}
                                            onChange={setSelectedWalletId}
                                            disabled={isWalletsLoading || cryptoOptions.length === 0}
                                            placeholder={isWalletsLoading ? 'Загружаем кошельки' : 'Нет активных кошельков'}
                                        />
                                    </label>

                                    <label className="about-field">
                                        <span>Сумма</span>
                                        <input name="expectedAmount" type="number" min="0.000000000000000001" step="any" placeholder="Например, 5" required />
                                    </label>

                                    {isAuth ? (
                                        <label className="about-field about-field--check">
                                            <input
                                                checked={isAnonymousDonation}
                                                type="checkbox"
                                                onChange={(event) => setIsAnonymousDonation(event.target.checked)}
                                            />
                                            <span>Анонимная поддержка</span>
                                        </label>
                                    ) : null}

                                    {(!isAuth || isAnonymousDonation) ? (
                                        <label className="about-field">
                                            <span>Псевдоним</span>
                                            <input name="donorName" type="text" maxLength="120" placeholder="NeonStack" required />
                                        </label>
                                    ) : (
                                        <label className="about-field">
                                            <span>От кого</span>
                                            <input type="text" value={user?.username || 'Ваш аккаунт'} readOnly />
                                        </label>
                                    )}

                                    <label className="about-field about-field--wide">
                                        <span>Кошелек</span>
                                        <div className="about-wallet-row">
                                            <input type="text" value={selectedWallet?.address || ''} readOnly />
                                            <button
                                                aria-label="Скопировать адрес кошелька"
                                                disabled={!selectedWallet?.address}
                                                type="button"
                                                onClick={handleCopyAddress}
                                            >
                                                <i className="fas fa-copy"></i>
                                            </button>
                                            <button
                                                aria-label="Показать QR-код"
                                                disabled={!selectedWallet?.address}
                                                type="button"
                                                onClick={() => setIsQrOpen(true)}
                                            >
                                                <i className="fas fa-qrcode"></i>
                                            </button>
                                        </div>
                                        {selectedWallet?.memoTag && <small>Memo/tag: {selectedWallet.memoTag}</small>}
                                        {selectedWallet?.memoRequired && !selectedWallet?.memoTag && (
                                            <small>Для этой сети нужен memo/tag. Укажите его в админке кошелька.</small>
                                        )}
                                    </label>

                                    <label className="about-field about-field--wide">
                                        <span>Комментарий</span>
                                        <textarea name="note" rows="3" placeholder="Можно оставить пару слов автору"></textarea>
                                    </label>

                                    <TurnstileWidget onTokenChange={handleTurnstileTokenChange} resetSignal={turnstileResetSignal} />

                                    <button type="submit" className="button about-button about-button--primary" disabled={isDonationSubmitting || !selectedWallet || !turnstileToken}>
                                        <i className="fas fa-wallet"></i>
                                        {isDonationSubmitting ? 'Сохраняем...' : 'Создать донат'}
                                    </button>
                                </form>
                            </div>
                        </GlowEffect>
                    </section>
                </section>

                {isQrOpen && selectedWallet?.address ? (
                    <div className="about-qr-modal" role="presentation" onMouseDown={() => setIsQrOpen(false)}>
                        <section
                            className="about-qr-modal__dialog"
                            role="dialog"
                            aria-modal="true"
                            aria-label="QR-код кошелька"
                            onMouseDown={(event) => event.stopPropagation()}
                        >
                            <button
                                className="about-qr-modal__close"
                                aria-label="Закрыть QR-код"
                                type="button"
                                onClick={() => setIsQrOpen(false)}
                            >
                                <i className="fas fa-times"></i>
                            </button>
                            <div className="about-qr-modal__code">
                                <QRCodeSVG
                                    value={selectedWallet.address}
                                    size={224}
                                    bgColor="#ffffff"
                                    fgColor="#07111f"
                                    level="M"
                                    includeMargin
                                />
                            </div>
                            <strong>{selectedWallet.currencyCode} / {selectedWallet.networkName}</strong>
                            <code>{selectedWallet.address}</code>
                            {selectedWallet.memoTag && <small>Memo/tag: {selectedWallet.memoTag}</small>}
                        </section>
                    </div>
                ) : null}
            </div>
        </section>
    )
}

export default AboutPage
