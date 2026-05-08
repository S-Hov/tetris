import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import GlowEffect from '@/shared/ui/GlowEffect'
import CustomSelect from '@/shared/ui/CustomSelect'
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

const donationWallets = [
    {
        id: 'ton-ton',
        currency: 'TON',
        network: 'TON',
        label: 'TON в сети TON',
        address: 'Адрес TON будет добавлен в админке',
    },
    {
        id: 'usdt-trc20',
        currency: 'USDT',
        network: 'TRC20',
        label: 'USDT в сети TRON TRC20',
        address: 'Адрес USDT TRC20 будет добавлен в админке',
    },
    {
        id: 'btc-bitcoin',
        currency: 'BTC',
        network: 'Bitcoin',
        label: 'Bitcoin',
        address: 'BTC-адрес будет добавлен в админке',
    },
    {
        id: 'eth-erc20',
        currency: 'ETH',
        network: 'Ethereum',
        label: 'ETH в сети Ethereum',
        address: 'ETH-адрес будет добавлен в админке',
    },
]

const cryptoOptions = donationWallets.map((wallet) => ({
    value: wallet.id,
    label: wallet.label,
    description: `${wallet.currency} | ${wallet.network}`,
    icon: 'fas fa-coins',
}))

const roadmapItems = [
    'честный матчмейкинг без pay-to-win',
    'режимы 1v1 и командные бои',
    'рейтинг, история матчей и профиль игрока',
    'будущие скины, турниры и зрительский режим',
]

const AboutPage = () => {
    const location = useLocation()
    const [selectedWalletId, setSelectedWalletId] = useState(donationWallets[0].id)
    const selectedWallet = donationWallets.find((wallet) => wallet.id === selectedWalletId) || donationWallets[0]

    useEffect(() => {
        if (!location.hash) {
            return
        }

        const target = document.querySelector(location.hash)
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [location.hash])

    const handleDonateSubmit = (event) => {
        event.preventDefault()
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
                                    они помогают оплатить сервер, домен, кофе и время на новые режимы. Сейчас форма
                                    работает как фронтовой макет без бекенда, а реальные кошельки будут добавлены
                                    владельцем проекта перед релизом страницы.
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
                                    />
                                </label>

                                <label className="about-field">
                                    <span>Сумма</span>
                                    <input type="number" min="1" placeholder="Например, 5" />
                                </label>

                                <label className="about-field about-field--wide">
                                    <span>Кошелек</span>
                                    <input type="text" value={selectedWallet.address} readOnly />
                                </label>

                                <button type="submit" className="button about-primary-button">
                                    <i className="fas fa-wallet"></i>
                                    Поддержать позже
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
