import AppSwitch from '@/shared/ui/AppSwitch'
import GlowEffect from '@/shared/ui/GlowEffect'
import InterfaceLanguageSelect from '@/shared/ui/InterfaceLanguageSelect'

import './GeneralSettingsSection.css'

const GeneralSettingsSection = ({
    isDarkTheme,
    isGlowEffectEnabled,
    onGlowEffectToggle,
    onThemeToggle,
    t,
}) => (
    <section className="account-settings-panel">
        <GlowEffect>
            <div className="glow-effect account-general-settings">
                <div className="account-section-title">
                    <i className="fas fa-palette"></i>
                    {t('accountSettings.general.title')}
                </div>
                <div className="account-theme-toggle account-language-setting">
                    <span>
                        <strong>{t('accountSettings.general.languageTitle')}</strong>
                        <small>{t('accountSettings.general.languageDescription')}</small>
                    </span>
                    <InterfaceLanguageSelect className="account-language-select" />
                </div>
                <button
                    type="button"
                    className="account-theme-toggle"
                    aria-pressed={isDarkTheme}
                    onClick={onThemeToggle}
                >
                    <span>
                        <strong>{t('accountSettings.general.darkThemeTitle')}</strong>
                        <small>{t('accountSettings.general.darkThemeDescription')}</small>
                    </span>
                    <AppSwitch checked={isDarkTheme} />
                </button>
                <button
                    type="button"
                    className="account-theme-toggle"
                    aria-pressed={isGlowEffectEnabled}
                    onClick={onGlowEffectToggle}
                >
                    <span>
                        <strong>{t('accountSettings.general.glowTitle')}</strong>
                        <small>{t('accountSettings.general.glowDescription')}</small>
                    </span>
                    <AppSwitch checked={isGlowEffectEnabled} />
                </button>
            </div>
        </GlowEffect>
    </section>
)

export default GeneralSettingsSection
