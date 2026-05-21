import { Link } from 'react-router-dom'

import AppSwitch from '@/shared/ui/AppSwitch'
import GlowEffect from '@/shared/ui/GlowEffect'
import { useGlowEffect } from '@/shared/hooks/useGlowEffect.js'
import { useTheme } from '@/shared/hooks/useTheme.js'

import './GameSettingsPage.css'

const GameSettingsPage = () => {
    const { isGlowEffectEnabled, toggleGlowEffect } = useGlowEffect()
    const { isDarkTheme, toggleTheme } = useTheme()

    return (
        <section className="section game-settings-page">
            <div className="container game-settings-page__container">
                <div className="game-settings-page__topbar">
                    <div>
                        <p className="game-settings-page__eyebrow">PVP Tetris</p>
                        <h1>Настройки игры</h1>
                    </div>
                </div>

                <GlowEffect className='game-settings-page__section__glow-effect'>
                    <section className="game-settings-page__section">
                        <div className="game-settings-page__section-head">
                            <i className="fas fa-keyboard"></i>
                            <h2>Настройки управления</h2>
                        </div>

                        <div className="game-settings-page__cards">
                            <SettingsCard
                                icon="fas fa-desktop"
                                title="Управление для ПК"
                                description="Переназначение клавиш для движения, вращения, падения и паузы."
                                to="/game/controls/pc"
                            />
                            <SettingsCard
                                icon="fas fa-mobile-screen-button"
                                title="Управление для мобильных"
                                description="Жесты, чувствительность свайпов и назначение действий."
                                to="/game/controls/mobile"
                            />
                        </div>
                    </section>
                </GlowEffect>

                <GlowEffect className='game-settings-page__section__glow-effect'>
                    <section className="game-settings-page__section">
                        <div className="game-settings-page__section-head">
                            <i className="fas fa-sliders"></i>
                            <h2>Общие</h2>
                        </div>

                        <div className="glow-effect game-settings-page__general">
                            <button
                                type="button"
                                className="game-settings-page__toggle"
                                aria-pressed={isDarkTheme}
                                onClick={toggleTheme}
                            >
                                <span>
                                    <strong>Тёмная тема</strong>
                                    <small>Переключает цветовую схему интерфейса</small>
                                </span>
                                <AppSwitch checked={isDarkTheme} />
                            </button>
                            <button
                                type="button"
                                className="game-settings-page__toggle"
                                aria-pressed={isGlowEffectEnabled}
                                onClick={toggleGlowEffect}
                            >
                                <span>
                                    <strong>Подсветка курсора</strong>
                                    <small>Включает свечение элементов при движении курсора</small>
                                </span>
                                <AppSwitch checked={isGlowEffectEnabled} />
                            </button>
                        </div>
                    </section>
                </GlowEffect>
            </div>
        </section>
    )
}

const SettingsCard = ({ description, icon, title, to }) => (
    <Link className="glow-effect game-settings-page__card" to={to}>
        <span className="game-settings-page__card-icon">
            <i className={icon}></i>
        </span>
        <span>
            <strong>{title}</strong>
            <small>{description}</small>
        </span>
        <i className="fas fa-arrow-right"></i>
    </Link>
)

export default GameSettingsPage
