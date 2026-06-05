import AppSwitch from '@/shared/ui/AppSwitch'
import CustomSelect from '@/shared/ui/CustomSelect'
import GlowEffect from '@/shared/ui/GlowEffect'
import InterfaceLanguageSelect from '@/shared/ui/InterfaceLanguageSelect'
import { BLUR_VARIABLES } from '@/shared/lib/interface-blur/blur.js'
import { RADIUS_UNITS, RADIUS_VARIABLES } from '@/shared/lib/interface-radius/radius.js'

import './GeneralSettingsSection.css'

const RADIUS_UNIT_OPTIONS = [
    { value: RADIUS_UNITS.PX, label: 'px' },
    { value: RADIUS_UNITS.PERCENT, label: '%' },
]

const GeneralSettingsSection = ({
    accentColor,
    blurSettings,
    isDarkTheme,
    isGlowEffectEnabled,
    onAccentColorChange,
    onBlurSettingChange,
    onGlowEffectToggle,
    onRadiusSettingChange,
    onThemeToggle,
    radiusSettings,
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
                <div className="account-radius-settings">
                    <div className="account-radius-settings__head">
                        <strong>{t('accountSettings.general.radiusTitle')}</strong>
                        <small>{t('accountSettings.general.radiusDescription')}</small>
                    </div>
                    <div className="account-radius-settings__grid">
                        {RADIUS_VARIABLES.map((variable) => {
                            const setting = radiusSettings[variable.key]

                            return (
                                <label className="account-radius-control" key={variable.key}>
                                    <span>{t(`accountSettings.general.radiusLabels.${variable.key}`)}</span>
                                    <div className="account-radius-control__inputs">
                                        <input
                                            aria-label={t('accountSettings.general.radiusValueAria', {
                                                name: t(`accountSettings.general.radiusLabels.${variable.key}`),
                                            })}
                                            max="100"
                                            min="0"
                                            onChange={(event) => onRadiusSettingChange(variable.key, {
                                                value: event.target.value,
                                            })}
                                            step="1"
                                            type="number"
                                            value={setting.value}
                                        />
                                        <CustomSelect
                                            className="account-radius-unit-select"
                                            onChange={(unit) => onRadiusSettingChange(variable.key, { unit })}
                                            options={RADIUS_UNIT_OPTIONS}
                                            value={setting.unit}
                                        />
                                    </div>
                                </label>
                            )
                        })}
                    </div>
                </div>
                <div className="account-radius-settings account-blur-settings">
                    <div className="account-radius-settings__head">
                        <strong>{t('accountSettings.general.blurTitle')}</strong>
                        <small>{t('accountSettings.general.blurDescription')}</small>
                    </div>
                    <div className="account-blur-settings__grid">
                        {BLUR_VARIABLES.map((variable) => (
                            <label className="account-blur-control" key={variable.key}>
                                <span>{t(`accountSettings.general.blurLabels.${variable.key}`)}</span>
                                <div className="account-blur-control__inputs">
                                    <input
                                        aria-label={t('accountSettings.general.blurValueAria', {
                                            name: t(`accountSettings.general.blurLabels.${variable.key}`),
                                        })}
                                        max={variable.max}
                                        min="0"
                                        onChange={(event) => onBlurSettingChange(variable.key, event.target.value)}
                                        step="1"
                                        type="range"
                                        value={blurSettings[variable.key]}
                                    />
                                    <output>{blurSettings[variable.key]}</output>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="account-radius-settings account-accent-settings">
                    <div className="account-radius-settings__head">
                        <strong>{t('accountSettings.general.accentTitle')}</strong>
                        <small>{t('accountSettings.general.accentDescription')}</small>
                    </div>
                    <label className="account-accent-control">
                        <span>{t('accountSettings.general.accentTurquoise')}</span>
                        <div className="account-accent-control__inputs">
                            <input
                                aria-label={t('accountSettings.general.accentColorAria')}
                                className="account-accent-control__picker"
                                onChange={(event) => onAccentColorChange(event.target.value)}
                                type="color"
                                value={accentColor}
                            />
                            <input
                                aria-label={t('accountSettings.general.accentHexAria')}
                                maxLength="7"
                                readOnly
                                type="text"
                                value={accentColor}
                            />
                        </div>
                    </label>
                </div>
            </div>
        </GlowEffect>
    </section>
)

export default GeneralSettingsSection
