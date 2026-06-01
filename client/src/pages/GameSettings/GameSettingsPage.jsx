import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import AppSwitch from '@/shared/ui/AppSwitch'
import GlowEffect from '@/shared/ui/GlowEffect'
import InterfaceLanguageSelect from '@/shared/ui/InterfaceLanguageSelect'
import { useGlowEffect } from '@/shared/hooks/useGlowEffect.js'
import { useTheme } from '@/shared/hooks/useTheme.js'

import './GameSettingsPage.css'

const GameSettingsPage = () => {
    const { t } = useTranslation()
    const { isGlowEffectEnabled, toggleGlowEffect } = useGlowEffect()
    const { isDarkTheme, toggleTheme } = useTheme()

    return (
        <section className="section game-settings-page">
            <div className="container game-settings-page__container">
                <div className="game-settings-page__topbar">
                    <div>
                        <p className="game-settings-page__eyebrow">{t('gameControls.common.eyebrow')}</p>
                        <h1>{t('gameControls.settings.title')}</h1>
                    </div>
                </div>

                <GlowEffect className='game-settings-page__section__glow-effect'>
                    <section className="game-settings-page__section">
                        <div className="game-settings-page__section-head">
                            <i className="fas fa-keyboard"></i>
                            <h2>{t('gameControls.settings.controlsTitle')}</h2>
                        </div>

                        <div className="game-settings-page__cards">
                            <SettingsCard
                                icon="fas fa-desktop"
                                title={t('gameControls.settings.pcTitle')}
                                description={t('gameControls.settings.pcDescription')}
                                to="/game/controls/pc"
                            />
                            <SettingsCard
                                icon="fas fa-mobile-screen-button"
                                title={t('gameControls.settings.mobileTitle')}
                                description={t('gameControls.settings.mobileDescription')}
                                to="/game/controls/mobile"
                            />
                        </div>
                    </section>
                </GlowEffect>

                <GlowEffect className='game-settings-page__section__glow-effect'>
                    <section className="game-settings-page__section">
                        <div className="game-settings-page__section-head">
                            <i className="fas fa-sliders"></i>
                            <h2>{t('gameControls.settings.generalTitle')}</h2>
                        </div>

                        <div className="glow-effect game-settings-page__general">
                            <div className="game-settings-page__toggle game-settings-page__language-setting">
                                <span>
                                    <strong>{t('gameControls.settings.languageTitle')}</strong>
                                    <small>{t('gameControls.settings.languageDescription')}</small>
                                </span>
                                <InterfaceLanguageSelect className="game-settings-page__language-select" />
                            </div>
                            <button
                                type="button"
                                className="game-settings-page__toggle"
                                aria-pressed={isDarkTheme}
                                onClick={toggleTheme}
                            >
                                <span>
                                    <strong>{t('gameControls.settings.darkThemeTitle')}</strong>
                                    <small>{t('gameControls.settings.darkThemeDescription')}</small>
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
                                    <strong>{t('gameControls.settings.glowTitle')}</strong>
                                    <small>{t('gameControls.settings.glowDescription')}</small>
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
