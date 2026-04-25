import { Link } from 'react-router-dom'
import './HomePage.css'
import GlowEffect from '@/shared/ui/GlowEffect'

const gameModes = [
    {
        key: 'solo',
        title: 'Одиночная игра',
        description: 'Тренируйте скорость, ставьте рекорды и доводите механику до автоматизма.',
        icon: 'fas fa-user',
        stats: ['Рекорд: 124 линии'],
        to: '/game/solo',
    },
    {
        key: 'duel',
        title: '1 VS 1 Дуэль',
        description: 'Сразитесь с соперником напрямую: скорость, точность и мусорные линии решают бой.',
        icon: 'fas fa-fist-raised',
        stats: ['1,234 онлайн', '~3 мин боя'],
        to: '/game/1v1',
    },
    {
        key: 'team',
        title: '2 VS 2 Команда',
        description: 'Играйте в паре, синхронизируйте атаки и вытаскивайте сложные партии вместе.',
        icon: 'fas fa-users',
        stats: ['Командный рейтинг'],
        to: '/game/2v2',
    },
    {
        key: 'squad',
        title: '5 VS 5 Битва',
        description: 'Массовая арена, где тактика команды важна не меньше, чем скорость каждого игрока.',
        icon: 'fas fa-gamepad',
        stats: ['Эпичные битвы'],
        to: '/game/5v5',
    },
    {
        key: 'royale',
        title: 'Королевская битва',
        description: 'Двадцать игроков входят в матч, но до финальной линии добирается только один.',
        icon: 'fas fa-crown',
        stats: ['Турнирный режим'],
        to: '/game/royale',
    },
    {
        key: 'tournament',
        title: 'Турниры',
        description: 'Регулярные сетки, призовые места и шанс встретиться с сильнейшими игроками арены.',
        icon: 'fas fa-trophy',
        stats: ['Еженедельно'],
        to: '/rating',
    },
]

const features = [
    {
        title: 'Мгновенные матчи',
        description: 'Поиск соперника за секунды',
        icon: 'fas fa-bolt',
    },
    {
        title: 'Рейтинговая система',
        description: 'Соревнуйтесь с равными',
        icon: 'fas fa-chart-line',
    },
    {
        title: 'Античит система',
        description: 'Честная игра для всех',
        icon: 'fas fa-shield-alt',
    },
    {
        title: 'Награды и скины',
        description: 'Кастомизируйте блоки',
        icon: 'fas fa-gem',
    },
]

const tetrisBlocks = [
    'home-block--cyan',
    'home-block--blue',
    'home-block--blue',
    'home-block--blue',
    'home-block--cyan',
    'home-block--cyan',
    'home-block--blue',
    'home-block--yellow',
    'home-block--cyan',
    'home-block--yellow',
    'home-block--yellow',
    'home-block--yellow',
    'home-block--pink',
    'home-block--pink',
    'home-block--pink',
    'home-block--pink',
]

const HomePage = () => {
    return (
        <section className="section home-page">
            <div className="container home-container">
                <section className="home-hero">
                    <div className="home-hero-copy">
                        <GlowEffect>
                            <div className="glow-effect">
                                <div className="home-badge">
                                    <i className="fas fa-gamepad"></i>
                                    Онлайн 2,847 игроков
                                </div>

                                <h1 className="home-title">
                                    Тетрис. Битвы. Кибер-арена.
                                </h1>

                                <p className="home-lead">
                                    Классическая игра в новом формате: дуэли в реальном времени, командные режимы,
                                    рейтинги и быстрые матчи без лишнего ожидания.
                                </p>

                                <div className="home-actions">
                                    <Link to="/profile" className="button home-play-button">
                                        <i className="fas fa-play"></i>
                                        Играть сейчас
                                    </Link>
                                    <Link to="/rating" className="button home-secondary-button">
                                        Рейтинг арены
                                    </Link>
                                </div>
                            </div>
                        </GlowEffect>
                    </div>
                    <div className="home-arena" aria-label="PvP Tetris arena preview">
                        <div className="home-arena-grid">
                            {tetrisBlocks.map((blockClassName, index) => (
                                <span key={index} className={`home-block ${blockClassName}`}></span>
                            ))}
                        </div>
                        <div className="home-arena-stat">
                            <span>APM</span>
                            <strong>128</strong>
                        </div>
                        <div className="home-arena-stat">
                            <span>Combo</span>
                            <strong>x7</strong>
                        </div>
                    </div>
                </section>

                <section className="home-section">
                    <div className="home-section-header">
                        <h2>Режимы игры</h2>
                        <p>Выберите свой формат битвы</p>
                    </div>

                    <div className="home-modes-grid">
                        {gameModes.map((mode) => (
                            <Link key={mode.key} to={mode.to} className="home-mode-card">
                                <GlowEffect>
                                    <div className='glow-effect'>
                                        <span className="home-mode-icon">
                                            <i className={mode.icon}></i>
                                        </span>
                                        <h3>{mode.title}</h3>
                                        <p>{mode.description}</p>
                                        <div className="home-mode-stats">
                                            {mode.stats.map((stat) => (
                                                <span key={stat}>
                                                    <i className="fas fa-signal"></i>
                                                    {stat}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </GlowEffect>
                            </Link>
                        ))}
                    </div>
                </section>

                <section className="home-features" aria-label="Преимущества">
                    <GlowEffect>
                        <div className="glow-effect">
                            {features.map((feature) => (
                                <article key={feature.title} className="home-feature">
                                    <i className={feature.icon}></i>
                                    <h3>{feature.title}</h3>
                                    <p>{feature.description}</p>
                                </article>
                            ))}
                        </div>
                    </GlowEffect>
                </section>

                <section className="home-cta">
                    <GlowEffect>
                        <div className="glow-effect">
                            <h2>Готовы к битве?</h2>
                            <p>Зайдите на арену, найдите матч и покажите свой темп.</p>
                            <Link to="/profile" className="button home-cta-button">
                                Начать играть
                            </Link>
                        </div>
                    </GlowEffect>
                </section>

                <footer className="home-footer">
                    <span>PVP Tetris - Кибер-арена будущего</span>
                    <nav>
                        <Link to="/support">Поддержка</Link>
                        <Link to="/rating">Рейтинг</Link>
                        <Link to="/profile">Профиль</Link>
                    </nav>
                </footer>
            </div>
        </section>
    )
}

export default HomePage
