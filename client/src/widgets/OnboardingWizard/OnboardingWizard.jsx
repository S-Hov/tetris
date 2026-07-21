import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import AppSwitch from '@/shared/ui/AppSwitch'
import CustomSelect from '@/shared/ui/CustomSelect'
import GlowEffect from '@/shared/ui/GlowEffect'
import InterfaceLanguageSelect from '@/shared/ui/InterfaceLanguageSelect'
import InterfaceScaleControl from '@/shared/ui/InterfaceScaleControl'
import { useAccentColor } from '@/shared/hooks/useAccentColor.js'
import { useAuth } from '@/shared/hooks/useAuth'
import { useGlowEffect } from '@/shared/hooks/useGlowEffect.js'
import { useInterfaceBlur } from '@/shared/hooks/useInterfaceBlur.js'
import { useInterfaceRadius } from '@/shared/hooks/useInterfaceRadius.js'
import { useTheme } from '@/shared/hooks/useTheme.js'
import { BLUR_VARIABLES } from '@/shared/lib/interface-blur/blur.js'
import { RADIUS_UNITS, RADIUS_VARIABLES } from '@/shared/lib/interface-radius/radius.js'
import {
    ONBOARDING_STAGES,
    completeOnboardingSetup,
    completeOnboardingTutorial,
    dismissOnboarding,
    getInitialOnboardingStage,
} from '@/shared/lib/onboarding/onboarding.js'
import { THEME_PALETTE_OPTIONS } from '@/shared/lib/theme/theme.js'
import { getLocalizedPath } from '@/i18n'

import './OnboardingWizard.css'

const SETUP_STEP_COUNT = 3
const TUTORIAL_STEP_COUNT = 3
const RADIUS_UNIT_OPTIONS = [
    { value: RADIUS_UNITS.PX, label: 'px' },
    { value: RADIUS_UNITS.PERCENT, label: '%' },
]

const OnboardingWizard = () => {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { isAuth } = useAuth()
    const [stage, setStage] = useState(getInitialOnboardingStage)
    const [setupStep, setSetupStep] = useState(0)
    const [tutorialStep, setTutorialStep] = useState(0)
    const closeButtonRef = useRef(null)

    const { accentColor, setAccentColor } = useAccentColor()
    const { blurSettings, setBlurSetting, toggleBlur } = useInterfaceBlur()
    const { isGlowEffectEnabled, toggleGlowEffect } = useGlowEffect()
    const { radiusSettings, setRadiusSetting } = useInterfaceRadius()
    const { isDarkTheme, setThemePalette, themePalette, toggleTheme } = useTheme()

    useEffect(() => {
        if (stage === ONBOARDING_STAGES.CLOSED) {
            return undefined
        }

        const previousOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        closeButtonRef.current?.focus()

        return () => {
            document.body.style.overflow = previousOverflow
        }
    }, [stage])

    if (stage === ONBOARDING_STAGES.CLOSED) {
        return null
    }

    const handleDismiss = () => {
        dismissOnboarding()
        setStage(ONBOARDING_STAGES.CLOSED)
    }

    const handleSetupNext = () => {
        if (setupStep < SETUP_STEP_COUNT - 1) {
            setSetupStep((currentStep) => currentStep + 1)
            return
        }

        completeOnboardingSetup()
        setTutorialStep(0)
        setStage(ONBOARDING_STAGES.TUTORIAL)
    }

    const handleTutorialNext = () => {
        if (tutorialStep < TUTORIAL_STEP_COUNT - 1) {
            setTutorialStep((currentStep) => currentStep + 1)
            return
        }

        completeOnboardingTutorial()
        setStage(ONBOARDING_STAGES.CLOSED)
    }

    const handleSecurityAction = () => {
        completeOnboardingTutorial()
        setStage(ONBOARDING_STAGES.CLOSED)
        navigate(getLocalizedPath(isAuth ? '/account-settings/security' : '/register'))
    }

    const activeStep = stage === ONBOARDING_STAGES.SETUP ? setupStep : tutorialStep
    const stepCount = stage === ONBOARDING_STAGES.SETUP ? SETUP_STEP_COUNT : TUTORIAL_STEP_COUNT
    const progress = ((activeStep + 1) / stepCount) * 100

    return (
        <div className="onboarding" role="presentation">
            <section
                className="onboarding__dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="onboarding-title"
            >
                <div
                    className="onboarding__progress"
                    role="progressbar"
                    aria-label={t('onboarding.progressAria')}
                    aria-valuemin="1"
                    aria-valuemax={stepCount}
                    aria-valuenow={activeStep + 1}
                >
                    <span style={{ width: `${progress}%` }} />
                </div>

                <header className="onboarding__header">
                    <div>
                        <span className="onboarding__eyebrow">
                            {stage === ONBOARDING_STAGES.SETUP
                                ? t('onboarding.setupEyebrow', { current: activeStep + 1, total: stepCount })
                                : t('onboarding.tutorialEyebrow', { current: activeStep + 1, total: stepCount })}
                        </span>
                        <h2 id="onboarding-title">
                            {stage === ONBOARDING_STAGES.SETUP
                                ? t(`onboarding.steps.${setupStep}.title`)
                                : t(`onboarding.tutorial.${tutorialStep}.title`)}
                        </h2>
                    </div>
                    <button
                        ref={closeButtonRef}
                        type="button"
                        className="onboarding__close"
                        aria-label={t('onboarding.hide')}
                        onClick={handleDismiss}
                    >
                        <i className="fas fa-times" aria-hidden="true" />
                    </button>
                </header>

                {stage === ONBOARDING_STAGES.SETUP ? (
                    <>
                        <SetupStep
                            accentColor={accentColor}
                            blurSettings={blurSettings}
                            isAuth={isAuth}
                            isDarkTheme={isDarkTheme}
                            isGlowEffectEnabled={isGlowEffectEnabled}
                            onAccentColorChange={setAccentColor}
                            onBlurSettingChange={setBlurSetting}
                            onBlurToggle={toggleBlur}
                            onGlowEffectToggle={toggleGlowEffect}
                            onRadiusSettingChange={setRadiusSetting}
                            onSecurityAction={handleSecurityAction}
                            onThemePaletteChange={setThemePalette}
                            onThemeToggle={toggleTheme}
                            radiusSettings={radiusSettings}
                            step={setupStep}
                            t={t}
                            themePalette={themePalette}
                        />
                        <WizardFooter
                            activeStep={setupStep}
                            nextLabel={setupStep === SETUP_STEP_COUNT - 1 ? t('onboarding.startTutorial') : t('onboarding.next')}
                            onBack={() => setSetupStep((currentStep) => Math.max(0, currentStep - 1))}
                            onDismiss={handleDismiss}
                            onNext={handleSetupNext}
                            setActiveStep={setSetupStep}
                            stepCount={SETUP_STEP_COUNT}
                            t={t}
                        />
                    </>
                ) : (
                    <>
                        <TutorialStep step={tutorialStep} t={t} />
                        <WizardFooter
                            activeStep={tutorialStep}
                            nextLabel={tutorialStep === TUTORIAL_STEP_COUNT - 1 ? t('onboarding.finish') : t('onboarding.next')}
                            onBack={() => setTutorialStep((currentStep) => Math.max(0, currentStep - 1))}
                            onDismiss={handleDismiss}
                            onNext={handleTutorialNext}
                            setActiveStep={setTutorialStep}
                            stepCount={TUTORIAL_STEP_COUNT}
                            t={t}
                        />
                    </>
                )}
            </section>
        </div>
    )
}

const SetupStep = ({ step, ...props }) => {
    if (step === 0) {
        return <AppearanceStep {...props} />
    }

    if (step === 1) {
        return <InterfaceStep {...props} />
    }

    return <SecurityStep {...props} />
}

const AppearanceStep = ({
    accentColor,
    isDarkTheme,
    onAccentColorChange,
    onThemePaletteChange,
    onThemeToggle,
    t,
    themePalette,
}) => (
    <div className="onboarding__content">
        <LanguageSetting t={t} />
        <SettingsBlock icon="fas fa-brush" title={t('onboarding.appearanceBlockTitle')}>
            <ToggleSetting
                checked={isDarkTheme}
                description={t('accountSettings.general.darkThemeDescription')}
                onToggle={onThemeToggle}
                title={t('accountSettings.general.darkThemeTitle')}
            />
            <GlowPanel>
                <div className="glow-effect onboarding-setting onboarding-setting--stacked">
                    <SettingCopy
                        description={t('accountSettings.general.themePaletteDescription')}
                        title={t('accountSettings.general.themePaletteTitle')}
                    />
                    <div className="onboarding-palettes" role="listbox" aria-label={t('accountSettings.general.themePaletteTitle')}>
                        {THEME_PALETTE_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={option.value === themePalette ? 'is-active' : ''}
                                aria-selected={option.value === themePalette}
                                role="option"
                                onClick={() => onThemePaletteChange(option.value)}
                            >
                                <span aria-hidden="true">
                                    {option.colors.map((color) => (
                                        <i key={color} style={{ '--onboarding-swatch': color }} />
                                    ))}
                                </span>
                                <strong>{t(option.labelKey)}</strong>
                            </button>
                        ))}
                    </div>
                </div>
            </GlowPanel>
            <GlowPanel>
                <label className="glow-effect onboarding-setting onboarding-accent">
                    <SettingCopy
                        description={t('accountSettings.general.accentDescription')}
                        title={t('accountSettings.general.accentTitle')}
                    />
                    <span className="onboarding-accent__control">
                        <input
                            aria-label={t('accountSettings.general.accentColorAria')}
                            onChange={(event) => onAccentColorChange(event.target.value)}
                            type="color"
                            value={accentColor}
                        />
                        <output>{accentColor}</output>
                    </span>
                </label>
            </GlowPanel>
        </SettingsBlock>
    </div>
)

const InterfaceStep = ({
    blurSettings,
    isGlowEffectEnabled,
    onBlurSettingChange,
    onBlurToggle,
    onGlowEffectToggle,
    onRadiusSettingChange,
    radiusSettings,
    t,
}) => (
    <div className="onboarding__content">
        <LanguageSetting t={t} />
        <SettingsBlock icon="fas fa-sliders" title={t('onboarding.interfaceBlockTitle')}>
            <GlowPanel>
                <div className="glow-effect onboarding-setting onboarding-setting--stacked">
                    <InterfaceScaleControl
                        title={t('accountSettings.general.scaleTitle')}
                        description={t('accountSettings.general.scaleDescription')}
                        resetLabel={t('accountSettings.general.scaleReset')}
                        valueAriaLabel={t('accountSettings.general.scaleAria')}
                    />
                </div>
            </GlowPanel>
            <ToggleSetting
                checked={isGlowEffectEnabled}
                description={t('accountSettings.general.glowDescription')}
                onToggle={onGlowEffectToggle}
                title={t('accountSettings.general.glowTitle')}
            />
            <GlowPanel>
                <div className="glow-effect onboarding-setting onboarding-setting--stacked">
                    <SettingCopy
                        description={t('accountSettings.general.radiusDescription')}
                        title={t('accountSettings.general.radiusTitle')}
                    />
                    <div className="onboarding-radius-grid">
                        {RADIUS_VARIABLES.map((variable) => {
                            const setting = radiusSettings[variable.key]

                            return (
                                <label key={variable.key}>
                                    <span>{t(`accountSettings.general.radiusLabels.${variable.key}`)}</span>
                                    <div>
                                        <input
                                            aria-label={t('accountSettings.general.radiusValueAria', {
                                                name: t(`accountSettings.general.radiusLabels.${variable.key}`),
                                            })}
                                            max="100"
                                            min="0"
                                            onChange={(event) => onRadiusSettingChange(variable.key, { value: event.target.value })}
                                            type="number"
                                            value={setting.value}
                                        />
                                        <CustomSelect
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
            </GlowPanel>
            <GlowPanel>
                <div className="glow-effect onboarding-setting onboarding-setting--stacked">
                    <ToggleSetting
                        checked={blurSettings.enabled}
                        description={t('accountSettings.general.blurToggleDescription')}
                        onToggle={onBlurToggle}
                        title={t('accountSettings.general.blurToggleTitle')}
                    />
                    <div className={`onboarding-blur-grid ${blurSettings.enabled ? '' : 'is-disabled'}`}>
                        {BLUR_VARIABLES.map((variable) => (
                            <label key={variable.key}>
                                <span>{t(`accountSettings.general.blurLabels.${variable.key}`)}</span>
                                <div>
                                    <input
                                        aria-label={t('accountSettings.general.blurValueAria', {
                                            name: t(`accountSettings.general.blurLabels.${variable.key}`),
                                        })}
                                        disabled={!blurSettings.enabled}
                                        max={variable.max}
                                        min="0"
                                        onChange={(event) => onBlurSettingChange(variable.key, event.target.value)}
                                        type="range"
                                        value={blurSettings[variable.key]}
                                    />
                                    <output>{blurSettings[variable.key]}</output>
                                </div>
                            </label>
                        ))}
                    </div>
                </div>
            </GlowPanel>
        </SettingsBlock>
    </div>
)

const SecurityStep = ({ isAuth, onSecurityAction, t }) => (
    <div className="onboarding__content onboarding-security">
        <GlowPanel>
            <div className="glow-effect onboarding-security__panel">
                <div className="onboarding-security__icon" aria-hidden="true">
                    <i className="fa-solid fa-fingerprint"></i>
                </div>
                <span>{t('onboarding.securityEyebrow')}</span>
                <h3>{isAuth ? t('onboarding.securityAuthTitle') : t('onboarding.securityTitle')}</h3>
                <p>{isAuth ? t('onboarding.securityAuthDescription') : t('onboarding.securityDescription')}</p>
                <button type="button" className="onboarding-security__action" onClick={onSecurityAction}>
                    <i className={isAuth ? 'fas fa-user-shield' : 'fas fa-user-plus'} aria-hidden="true" />
                    {isAuth ? t('onboarding.openSecurity') : t('onboarding.register')}
                </button>
            </div>
        </GlowPanel>
    </div>
)

const TutorialStep = ({ step, t }) => (
    <div className="onboarding__content onboarding-tutorial">
        <div className="onboarding-tutorial__visual" aria-hidden="true">
            <i className={t(`onboarding.tutorial.${step}.icon`)} />
            <span>{step + 1}</span>
        </div>
        <p>{t(`onboarding.tutorial.${step}.description`)}</p>
        <div className="onboarding-tutorial__hint">
            <i className="fas fa-lightbulb" aria-hidden="true" />
            <span>{t(`onboarding.tutorial.${step}.hint`)}</span>
        </div>
    </div>
)

const LanguageSetting = ({ t }) => (
    <GlowPanel>
        <div className="glow-effect onboarding-setting">
            <SettingCopy
                description={t('accountSettings.general.languageDescription')}
                title={t('accountSettings.general.languageTitle')}
            />
            <InterfaceLanguageSelect className="onboarding-language" menuPlacement="bottom" />
        </div>
    </GlowPanel>
)

const SettingsBlock = ({ children, icon, title }) => (
    <GlowPanel>
        <section className="glow-effect onboarding-block">
            <header>
                <i className={icon} aria-hidden="true" />
                <h3>{title}</h3>
            </header>
            <div>{children}</div>
        </section>
    </GlowPanel>
)

const SettingCopy = ({ description, title }) => (
    <span className="onboarding-setting__copy">
        <strong>{title}</strong>
        <small>{description}</small>
    </span>
)

const ToggleSetting = ({ checked, description, onToggle, title }) => (
    <GlowPanel>
        <button type="button" className="glow-effect onboarding-setting onboarding-toggle" aria-pressed={checked} onClick={onToggle}>
            <SettingCopy description={description} title={title} />
            <AppSwitch checked={checked} />
        </button>
    </GlowPanel>
)

const GlowPanel = ({ children }) => (
    <GlowEffect className="onboarding-glow-panel">
        {children}
    </GlowEffect>
)

const WizardFooter = ({
    activeStep,
    nextLabel,
    onBack,
    onDismiss,
    onNext,
    setActiveStep,
    stepCount,
    t,
}) => (
    <footer className="onboarding__footer">
        <button type="button" className="onboarding__skip" onClick={onDismiss}>
            {t('onboarding.hide')}
        </button>
        <div className="onboarding__step-buttons" aria-label={t('onboarding.stepsAria')}>
            {Array.from({ length: stepCount }, (_, index) => (
                <button
                    key={index}
                    type="button"
                    className={index === activeStep ? 'is-active' : ''}
                    aria-label={t('onboarding.goToStep', { step: index + 1 })}
                    aria-current={index === activeStep ? 'step' : undefined}
                    onClick={() => setActiveStep(index)}
                >
                    {index + 1}
                </button>
            ))}
        </div>
        <div className="onboarding__actions">
            <button type="button" disabled={activeStep === 0} onClick={onBack}>
                {t('onboarding.back')}
            </button>
            <button type="button" className="is-primary" onClick={onNext}>
                {nextLabel}
                <i className="fas fa-arrow-right" aria-hidden="true" />
            </button>
        </div>
    </footer>
)

export default OnboardingWizard
