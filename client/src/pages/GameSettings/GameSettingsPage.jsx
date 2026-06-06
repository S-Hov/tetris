import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import AppSwitch from '@/shared/ui/AppSwitch'
import GlowEffect from '@/shared/ui/GlowEffect'
import InterfaceLanguageSelect from '@/shared/ui/InterfaceLanguageSelect'
import { getLocalizedGamePath } from '@/i18n'
import { useGlowEffect } from '@/shared/hooks/useGlowEffect.js'
import { useTheme } from '@/shared/hooks/useTheme.js'
import '@/widgets/ProfileSideNav/ProfileSideNav.css'

import './GameSettingsPage.css'

const GameSettingsPage = () => {
    const { t } = useTranslation()
    const { isGlowEffectEnabled, toggleGlowEffect } = useGlowEffect()
    const { isDarkTheme, toggleTheme } = useTheme()

    return (
        <section className="section game-settings-page">
            <div className="container game-settings-page__layout profile-layout-shell">
                <GameSettingsSideNav t={t} />

                <div className="game-settings-page__container profile-layout-content">
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
                                    to={getLocalizedGamePath('/game/controls/pc')}
                                />
                                <SettingsCard
                                    icon="fas fa-mobile-screen-button"
                                    title={t('gameControls.settings.mobileTitle')}
                                    description={t('gameControls.settings.mobileDescription')}
                                    to={getLocalizedGamePath('/game/controls/mobile')}
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
            </div>
        </section>
    )
}

const GameSettingsSideNav = ({ t }) => (
    <aside className="profile-sidebar game-settings-sidebar" aria-label={t('gameControls.settings.title')}>
        <GameSettingsSideNavItem
            icon="fas fa-user"
            label={t('modeSelect.modes.solo.title')}
            meta={t('modeSelect.modes.solo.heroLabel')}
            to={getLocalizedGamePath('/game/solo')}
        />
        <GameSettingsSideNavItem
            icon="fas fa-fist-raised"
            label={t('modeSelect.modes.1v1.title')}
            meta={t('modeSelect.modes.1v1.heroLabel')}
            to={getLocalizedGamePath('/game/1v1')}
        />
        <GameSettingsSideNavItem
            icon="fas fa-users"
            label={t('modeSelect.modes.2v2.title')}
            meta={t('modeSelect.modes.2v2.heroLabel')}
            to={getLocalizedGamePath('/game/2v2')}
        />
        <GameSettingsSideNavItem
            icon="fas fa-gamepad"
            label={t('modeSelect.modes.5v5.title')}
            meta={t('modeSelect.modes.5v5.heroLabel')}
            to={getLocalizedGamePath('/game/5v5')}
        />
        <GameSettingsSideNavItem
            icon="fas fa-crown"
            label={t('modeSelect.modes.royale.title')}
            meta={t('modeSelect.modes.royale.heroLabel')}
            to={getLocalizedGamePath('/game/royale')}
        />
        <Link
            className="profile-sidebar__item profile-sidebar__item--active game-settings-sidebar__item"
            to={getLocalizedGamePath('/game/controls')}
        >
            <i className="fas fa-gear"></i>
            <span>{t('gameControls.settings.title')}</span>
            <small>{t('gameControls.settings.controlsTitle')}</small>
            <div class="border-glow"></div>
        </Link>
    </aside>
)

const GameSettingsSideNavItem = ({ icon, label, meta, to }) => (
    <Link className="profile-sidebar__item game-settings-sidebar__item" to={to}>
        <i className={icon}></i>
        <span>{label}</span>
        <small>{meta}</small>
    </Link>
)

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
