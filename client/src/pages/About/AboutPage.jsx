import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import GlowEffect from '@/shared/ui/GlowEffect'
import CustomSelect from '@/shared/ui/CustomSelect'
import { supportAPI } from '@/shared/api/support'
import { useAuth } from '@/shared/hooks/useAuth'
import notify from '@/utils/Notifications'
import './AboutPage.css'

const projectFacts = [
    {
        value: '20',
        label: 'лет автору',
        icon: 'fas fa-user-graduate',
    },
    {
        value: '0₽',
        label: 'стоимость игры',
        icon: 'fas fa-heart',
    },
    {
        value: 'PvP',
        label: 'главная идея',
        icon: 'fas fa-bolt',
    },
]

const roadmapItems = [
    'честный матчмейкинг без pay-to-win',
    'режимы 1v1 и командные бои',
    'рейтинг, история матчей и профиль игрока',
    'будущие скины, турниры и зрительский режим',
]

const AboutPage = () => {
    const location = useLocation()
    const { isAuth, user } = useAuth()
    const [donationWallets, setDonationWallets] = useState([])
    const [selectedWalletId, setSelectedWalletId] = useState('')
    const [isAnonymousDonation, setIsAnonymousDonation] = useState(false)
    const [isWalletsLoading, setIsWalletsLoading] = useState(true)
    const [isDonationSubmitting, setIsDonationSubmitting] = useState(false)
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

    const handleDonateSubmit = async (event) => {
        event.preventDefault()

        if (!selectedWallet) {
            notify('Сейчас нет активного кошелька для доната', 'error')
            return
        }

        const formData = new FormData(event.currentTarget)

        setIsDonationSubmitting(true)

        try {
            await supportAPI.createDonation({
                walletId: selectedWallet.id,
                isAnonymous: !isAuth || isAnonymousDonation,
                expectedAmount: formData.get('expectedAmount'),
                donorName: formData.get('donorName') || (isAuth && !isAnonymousDonation ? user?.username : ''),
                note: formData.get('note'),
            })

            event.currentTarget.reset()
            notify('Донат создан. Спасибо за поддержку!', 'success')
        } catch (error) {
            notify(error.message || 'Не удалось создать донат', 'error')
        } finally {
            setIsDonationSubmitting(false)
        }
    }

    return (
        <section className="section about-page">
            <div className="container about-container">
                <section className="about-hero">
                    <GlowEffect>
                        <div className="glow-effect about-hero-content">
                            <div className="about-hero-copy">
                                <p className="about-eyebrow">О проекте</p>
                                <h1>PvP Tetris родился из любви к быстрым партиям</h1>
                                <p>
                                    Это бесплатная онлайн-арена, где классический тетрис превращается в дуэли,
                                    командные матчи и маленькую кибер-битву за каждую линию. Проект делает один
                                    20-летний студент: между учебой, багами, бессонными вечерами и верой, что
                                    честная игра может быть красивой даже без огромной студии за спиной.
                                </p>
                                <div className="about-actions">
                                    <Link to="/game/1v1" className="button about-primary-button">
                                        <i className="fas fa-play"></i>
                                        Войти в арену
                                    </Link>
                                    <Link to="/support" className="button about-secondary-button">
                                        Написать идею
                                    </Link>
                                </div>
                            </div>

                            <div className="about-stack-preview" aria-label="Декоративная тетрис-сетка">
                                {Array.from({ length: 24 }).map((_, index) => (
                                    <span key={index} className={`about-block about-block--${index % 5}`}></span>
                                ))}
                            </div>
                        </div>
                    </GlowEffect>
                </section>

                <section className="about-facts" aria-label="Факты о проекте">
                    {projectFacts.map((fact) => (
                        <article key={fact.label} className="about-fact-card">
                            <GlowEffect>
                                <div className="glow-effect">
                                    <i className={fact.icon}></i>
                                    <strong>{fact.value}</strong>
                                    <span>{fact.label}</span>
                                </div>
                            </GlowEffect>
                        </article>
                    ))}
                </section>

                <div className="about-grid">
                    <section className="about-card about-card--story">
                        <GlowEffect className={'about-card--story-full-glow-bg'}>
                            <div className="glow-effect">
                                <div className="about-section-title">
                                    <i className="fas fa-code"></i>
                                    Что это за место
                                </div>
                                <p>
                                    PvP Tetris не пытается продавать вам "революцию". Он просто берет понятную
                                    механику, добавляет соревновательный темп, комнаты, рейтинг и режимы для тех,
                                    кто любит играть не только против фигур, но и против живого соперника.
                                </p>
                                <p>
                                    Сейчас проект еще растет: где-то уже есть рабочая арена, где-то торчат
                                    строительные леса, а некоторые кнопки пока честно ждут своего бекенда.
                                    Но цель простая: сделать игру, куда приятно зайти на пять минут и неожиданно
                                    остаться на час.
                                </p>
                            </div>
                        </GlowEffect>
                    </section>

                    <section className="about-card about-card--roadmap">
                        <GlowEffect>
                            <div className="glow-effect">
                                <div className="about-section-title">
                                    <i className="fas fa-route"></i>
                                    Куда все движется
                                </div>
                                <div className="about-roadmap-list">
                                    {roadmapItems.map((item) => (
                                        <span key={item}>
                                            <i className="fas fa-check"></i>
                                            {item}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </GlowEffect>
                    </section>
                </div>

                <section className="about-donate-card" id="donate">
                    <GlowEffect className={'about-donate-card-glow'}>
                        <div className="glow-effect about-donate-content">
                            <div className="about-donate-copy">
                                <p className="about-eyebrow">Поддержать автора</p>
                                <h2>Если игра зашла, можно кинуть пару блоков в копилку</h2>
                                <p>
                                    Проект бесплатный и таким должен оставаться. Донаты не дают преимущества в матчах:
                                    они помогают оплатить сервер, домен, кофе и время на новые режимы. Заявка на донат
                                    сохраняется на сервере, а активные кошельки берутся из базы проекта.
                                </p>
                            </div>

                            <form className="about-donate-form" onSubmit={handleDonateSubmit}>
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
                                    <input type="text" value={selectedWallet?.address || ''} readOnly />
                                    {selectedWallet?.memoTag && <small>Memo/tag: {selectedWallet.memoTag}</small>}
                                    {selectedWallet?.memoRequired && !selectedWallet?.memoTag && <small>Для этой сети нужен memo/tag. Укажите его в админке кошелька.</small>}
                                </label>

                                <label className="about-field about-field--wide">
                                    <span>Комментарий</span>
                                    <textarea name="note" rows="3" placeholder="Можно оставить пару слов автору"></textarea>
                                </label>

                                <button type="submit" className="button about-primary-button" disabled={isDonationSubmitting || !selectedWallet}>
                                    <i className="fas fa-wallet"></i>
                                    {isDonationSubmitting ? 'Сохраняем...' : 'Создать донат'}
                                </button>
                            </form>
                        </div>
                    </GlowEffect>
                </section>
            </div>
        </section>
    )
}

export default AboutPage
