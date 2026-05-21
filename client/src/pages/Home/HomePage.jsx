import { Link } from 'react-router-dom'
import './HomePage.css'

import bunnerBg from './assets/bunner/bunner_bg.png'
import bunnerImg from './assets/bunner/bunner_img.png'
import modeSolo from './assets/modes/mode_solo.png'
import mode1vs1 from './assets/modes/mode_1vs1.png'
import mode2vs2 from './assets/modes/mode_2vs2.png'
import mode5vs5 from './assets/modes/mode_5vs5.png'
import modeRoyale from './assets/modes/mode_royal.png'

const arenaStats = [
    { key: 'online', icon: 'fas fa-users', value: '2,481', label: 'онлайн' },
    { key: 'matches', icon: 'fas fa-clock', value: '128', label: 'матчей сейчас' },
    { key: 'queue', icon: 'far fa-user', value: '56', label: 'игроков в очереди' },
    { key: 'season', icon: 'fa-solid fa-chart-line', value: 'Сезон 1', label: '' },
]

const gameModes = [
    {
        key: 'solo',
        title: 'Solo',
        description: 'Тренеруйся в одиночном режиме, стань лучшим',
        // queue: 'В очереди: 56 игроков',
        to: '/game/solo',
        image: modeSolo,
        tone: 'violet',
    },
    {
        key: '1v1',
        title: '1vs1',
        label: 'Рекомендуем',
        description: 'классическая дуэль',
        queue: 'В очереди: 24 игрока',
        to: '/game/1v1',
        image: mode1vs1,
        tone: 'blue',
    },
    {
        key: '2v2',
        title: '2vs2',
        description: 'играйте в паре',
        queue: 'В очереди: 18 команд',
        to: '/game/2v2',
        image: mode2vs2,
        tone: 'green',
    },
    {
        key: '5v5',
        title: '5vs5',
        description: 'массовая битва команд',
        queue: 'В очереди: 12 команд',
        to: '/game/5v5',
        image: mode5vs5,
        tone: 'orange',
    },
    {
        key: 'royale',
        title: 'Royale',
        description: 'последний выживший',
        queue: 'В очереди: 31 игрок',
        to: '/game/royale',
        image: modeRoyale,
        tone: 'magenta',
    },
]

const HomePage = () => (
    <section className="section home-page">
        <div className="container home-container">

            <section className="home-bunner" style={{ '--home-bunner-bg': `url(${bunnerBg})` }}>
                <div>
                    <section className="home-arena-panel" aria-label="Статистика арены">
                        {arenaStats.map((stat) => (
                            <div className="home-arena-panel__item" key={stat.key}>
                                <span className="home-arena-panel__icon">
                                    <i className={stat.icon}></i>
                                </span>
                                <span>
                                    <strong>{stat.value}</strong>
                                    <small>{stat.label}</small>
                                </span>
                            </div>
                        ))}
                    </section>
                    <div className="home-bunner__content">
                        <h1>
                            Сражайся.
                            <span>Стань легендой.</span>
                        </h1>
                        <p>
                            Классический тетрис в новом формате. Динамичные PvP-битвы,
                            уникальные режимы и настоящая кибер-арена ждут тебя!
                        </p>

                        <div className="home-bunner__actions">
                            <Link to="/game/solo" className="home-primary-button">
                                <i className="fas fa-play"></i>
                                Играть сейчас
                            </Link>
                            <Link to="/rating" className="home-secondary-button button">
                                <i className="fas fa-crown"></i>
                                Рейтинг арены
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="home-bunner__preview" aria-label="PvP Tetris preview">
                    <img src={bunnerImg} alt="" />
                </div>
            </section>

            <section className="home-modes" aria-labelledby="home-modes-title">
                <h2 id="home-modes-title">
                    <i className="fas fa-check"></i>
                    Выбери режим
                </h2>

                <div className="home-modes__grid">
                    {gameModes.map((mode) => (
                        <Link
                            className={`home-mode-card home-mode-card--${mode.tone}`}
                            key={mode.key}
                            to={mode.to}
                            style={{ '--mode-bg': `url(${mode.image})` }}
                        >
                            {mode.label ? <span className="home-mode-card__label">{mode.label}</span> : null}
                            <span className="home-mode-card__title">{mode.title}</span>
                            <span className="home-mode-card__description">{mode.description}</span>
                            <span className="home-mode-card__footer">
                                <span>{mode.queue}</span>
                                <i className="fas fa-arrow-right"></i>
                            </span>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    </section>
)

export default HomePage
