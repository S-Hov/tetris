import AppSwitch from '@/shared/ui/AppSwitch'
import CookieConsentControls from '@/shared/ui/CookieConsentControls'
import CustomSelect from '@/shared/ui/CustomSelect'
import GlowEffect from '@/shared/ui/GlowEffect'
import InterfaceLanguageSelect from '@/shared/ui/InterfaceLanguageSelect'
import InterfaceScaleControl from '@/shared/ui/InterfaceScaleControl'
import { BLUR_VARIABLES } from '@/shared/lib/interface-blur/blur.js'
import { RADIUS_UNITS, RADIUS_VARIABLES } from '@/shared/lib/interface-radius/radius.js'
import {
    INTERFACE_SHADOW_MAX,
    INTERFACE_SHADOW_MIN,
    INTERFACE_SHADOW_STEP,
} from '@/shared/lib/interface-shadow/shadow.js'
import { THEME_PALETTE_OPTIONS } from '@/shared/lib/theme/theme.js'

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
    onBlurToggle,
    onGlowEffectToggle,
    onThemePaletteChange,
    onRadiusSettingChange,
    onShadowIntensityChange,
    onThemeToggle,
    radiusSettings,
    shadowIntensity,
    t,
    themePalette,
}) => (
    <section className="account-settings-panel">
        <GlowEffect>
            <div className="glow-effect account-general-settings">
                <div className="account-section-title">
                    <i className="fa-solid fa-bars-staggered"></i>
                    {t('accountSettings.general.title')}
                </div>

                <GeneralSettingsGroup
                    description={t('accountSettings.general.appearanceSectionDescription')}
                    icon="fas fa-brush"
                    title={t('accountSettings.general.appearanceSectionTitle')}
                >
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

                    <div className="account-theme-toggle account-theme-palette-setting">
                        <span>
                            <strong>{t('accountSettings.general.themePaletteTitle')}</strong>
                            <small>{t('accountSettings.general.themePaletteDescription')}</small>
                        </span>
                        <div className="account-theme-palette-options" role="listbox" aria-label={t('accountSettings.general.themePaletteTitle')}>
                            {THEME_PALETTE_OPTIONS.map((option) => {
                                const isSelected = option.value === themePalette

                                return (
                                    <button
                                        key={option.value}
                                        type="button"
                                        className={`account-theme-palette-option ${isSelected ? 'is-active' : ''}`}
                                        aria-selected={isSelected}
                                        role="option"
                                        onClick={() => onThemePaletteChange(option.value)}
                                    >
                                        <span className="account-theme-palette-option__swatches" aria-hidden="true">
                                            {option.colors.map((color) => (
                                                <span
                                                    key={color}
                                                    className="account-theme-palette-option__swatch"
                                                    style={{ '--theme-swatch-color': color }}
                                                />
                                            ))}
                                        </span>
                                        <strong>{t(option.labelKey)}</strong>
                                    </button>
                                )
                            })}
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
                </GeneralSettingsGroup>

                <GeneralSettingsGroup
                    description={t('accountSettings.general.interfaceSectionDescription')}
                    icon="fas fa-sliders"
                    title={t('accountSettings.general.interfaceSectionTitle')}
                >
                    <div className="account-theme-toggle account-language-setting">
                        <span>
                            <strong>{t('accountSettings.general.languageTitle')}</strong>
                            <small>{t('accountSettings.general.languageDescription')}</small>
                        </span>
                        <InterfaceLanguageSelect className="account-language-select" />
                    </div>

                    <div className="account-radius-settings account-scale-settings">
                        <InterfaceScaleControl
                            title={t('accountSettings.general.scaleTitle')}
                            description={t('accountSettings.general.scaleDescription')}
                            resetLabel={t('accountSettings.general.scaleReset')}
                            valueAriaLabel={t('accountSettings.general.scaleAria')}
                        />
                    </div>

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

                    <div className="account-radius-settings account-shadow-settings">
                        <div className="account-radius-settings__head">
                            <strong>{t('accountSettings.general.shadowIntensityTitle')}</strong>
                            <small>{t('accountSettings.general.shadowIntensityDescription')}</small>
                        </div>
                        <label className="account-blur-control">
                            <span>{t('accountSettings.general.shadowIntensityLabel')}</span>
                            <div className="account-blur-control__inputs">
                                <input
                                    aria-label={t('accountSettings.general.shadowIntensityAria')}
                                    max={INTERFACE_SHADOW_MAX}
                                    min={INTERFACE_SHADOW_MIN}
                                    onChange={(event) => onShadowIntensityChange(event.target.value)}
                                    step={INTERFACE_SHADOW_STEP}
                                    type="range"
                                    value={shadowIntensity}
                                />
                                <output>{shadowIntensity}%</output>
                            </div>
                        </label>
                    </div>

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
                        <button
                            type="button"
                            className="account-theme-toggle account-blur-toggle"
                            aria-pressed={blurSettings.enabled}
                            onClick={onBlurToggle}
                        >
                            <span>
                                <strong>{t('accountSettings.general.blurToggleTitle')}</strong>
                                <small>{t('accountSettings.general.blurToggleDescription')}</small>
                            </span>
                            <AppSwitch checked={blurSettings.enabled} />
                        </button>
                        <div
                            className={`account-blur-settings__grid ${blurSettings.enabled ? '' : 'is-disabled'}`}
                            aria-disabled={!blurSettings.enabled}
                        >
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
                                            disabled={!blurSettings.enabled}
                                        />
                                        <output>{blurSettings[variable.key]}</output>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                </GeneralSettingsGroup>

                <GeneralSettingsGroup
                    description={t('accountSettings.general.cookieSectionDescription')}
                    icon="fas fa-cookie-bite"
                    title={t('accountSettings.general.cookieSectionTitle')}
                >
                    <div className="account-radius-settings account-cookie-settings">
                        <div className="account-radius-settings__head">
                            <strong>{t('accountSettings.general.cookieTitle')}</strong>
                            <small>{t('accountSettings.general.cookieDescription')}</small>
                        </div>
                        <CookieConsentControls />
                    </div>
                </GeneralSettingsGroup>
            </div>
        </GlowEffect>
    </section>
)

const GeneralSettingsGroup = ({ children, description, icon, title }) => (
    <section className="account-settings-group">
        <div className="account-settings-group__head">
            <span aria-hidden="true">
                <i className={icon}></i>
            </span>
            <div>
                <h3>{title}</h3>
                <p>{description}</p>
            </div>
        </div>
        <div className="account-settings-group__body">
            {children}
        </div>
    </section>
)

export default GeneralSettingsSection
