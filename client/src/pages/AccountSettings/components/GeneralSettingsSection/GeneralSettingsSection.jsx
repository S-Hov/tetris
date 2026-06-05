import AppSwitch from '@/shared/ui/AppSwitch'
import CustomSelect from '@/shared/ui/CustomSelect'
import GlowEffect from '@/shared/ui/GlowEffect'
import InterfaceLanguageSelect from '@/shared/ui/InterfaceLanguageSelect'
import { RADIUS_UNITS, RADIUS_VARIABLES } from '@/shared/lib/interface-radius/radius.js'

import './GeneralSettingsSection.css'

const RADIUS_UNIT_OPTIONS = [
    { value: RADIUS_UNITS.PX, label: 'px' },
    { value: RADIUS_UNITS.PERCENT, label: '%' },
]

const GeneralSettingsSection = ({
    isDarkTheme,
    isGlowEffectEnabled,
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
            </div>
        </GlowEffect>
    </section>
)

export default GeneralSettingsSection
