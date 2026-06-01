import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import CustomSelect from '@/shared/ui/CustomSelect'
import {
    DEFAULT_MOBILE_CONTROL_SETTINGS,
    MOBILE_CONTROL_METHODS,
    TOUCH_ACTIONS,
    TOUCH_GESTURES,
    loadMobileControlSettings,
    saveMobileControlSettings,
} from '@/features/tetris/model/mobileControls.js'

import './MobileControlsPage.css'
import GlowEffect from '@/shared/ui/GlowEffect'

const gestureOrder = [
    TOUCH_GESTURES.SWIPE_LEFT,
    TOUCH_GESTURES.SWIPE_RIGHT,
    TOUCH_GESTURES.SWIPE_DOWN_SHORT,
    TOUCH_GESTURES.SWIPE_DOWN_LONG,
    TOUCH_GESTURES.TAP,
    TOUCH_GESTURES.DOUBLE_TAP,
]

const sensitivityFields = [
    {
        key: 'minSwipe',
        label: 'MIN_SWIPE',
        unit: 'px',
        min: 8,
        max: 80,
    },
    {
        key: 'repeatStep',
        label: 'REPEAT_STEP',
        unit: 'px',
        min: 12,
        max: 96,
    },
    {
        key: 'tapMaxTime',
        label: 'TAP_MAX_TIME',
        unit: 'ms',
        min: 80,
        max: 360,
    },
    {
        key: 'tapMaxMove',
        label: 'TAP_MAX_MOVE',
        unit: 'px',
        min: 4,
        max: 32,
    },
]

const MobileControlsPage = () => {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [settings, setSettings] = useState(() => loadMobileControlSettings())
    const isGestures = settings.method === MOBILE_CONTROL_METHODS.GESTURES
    const methodOptions = [
        {
            value: MOBILE_CONTROL_METHODS.GESTURES,
            label: t('gameControls.mobile.gestures'),
            icon: 'fas fa-hand-pointer',
        },
        {
            value: MOBILE_CONTROL_METHODS.BUTTONS,
            label: t('gameControls.mobile.buttons'),
            icon: 'fas fa-gamepad',
            description: t('gameControls.mobile.buttonsDescription'),
        },
    ]
    const actionOptions = Object.values(TOUCH_ACTIONS).map((action) => ({
        value: action,
        label: t(`gameControls.mobile.actions.${action}`),
    }))

    const updateSettings = (nextSettings) => {
        setSettings(saveMobileControlSettings(nextSettings))
    }

    const handleMethodChange = (method) => {
        updateSettings({
            ...settings,
            method,
        })
    }

    const handleSensitivityChange = (key, value) => {
        updateSettings({
            ...settings,
            sensitivity: {
                ...settings.sensitivity,
                [key]: Number(value),
            },
        })
    }

    const handleGestureActionChange = (gesture, action) => {
        updateSettings({
            ...settings,
            gestureActions: {
                ...settings.gestureActions,
                [gesture]: action,
            },
        })
    }

    const handleReset = () => {
        updateSettings(DEFAULT_MOBILE_CONTROL_SETTINGS)
    }

    return (
        <section className="mobile-controls-page">
            <div className="container mobile-controls-page__container">
                <header className="mobile-controls-page__header">
                    <button
                        className="mobile-controls-page__back"
                        type="button"
                        aria-label={t('gameControls.common.back')}
                        onClick={() => navigate(-1)}
                    >
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <span>{t('gameControls.common.controlsEyebrow')}</span>
                        <h1>{t('gameControls.mobile.title')}</h1>
                    </div>
                    <button className="mobile-controls-page__reset" type="button" onClick={handleReset}>
                        {t('gameControls.mobile.reset')}
                    </button>
                </header>

                <div className="mobile-controls-page__grid">
                    <GlowEffect className="mobile-controls-page__panel__glow-effect">
                        <section className="mobile-controls-page__panel">
                            <h2>{t('gameControls.mobile.methodTitle')}</h2>
                            <CustomSelect
                                value={settings.method}
                                options={methodOptions}
                                onChange={handleMethodChange}
                            />
                            {settings.method === MOBILE_CONTROL_METHODS.BUTTONS ? (
                                <p className="mobile-controls-page__note">
                                    {t('gameControls.mobile.buttonsNote')}
                                </p>
                            ) : null}
                        </section>
                    </GlowEffect>

                    {isGestures ? (
                        <>
                            <GlowEffect className="mobile-controls-page__panel__glow-effect">
                                <section className="mobile-controls-page__panel">
                                    <h2>{t('gameControls.mobile.sensitivityTitle')}</h2>
                                    <div className="mobile-controls-page__fields">
                                        {sensitivityFields.map((field) => (
                                            <label className="mobile-controls-page__field" key={field.key}>
                                                <span>
                                                    {field.label}
                                                    <b>{settings.sensitivity[field.key]} {field.unit}</b>
                                                </span>
                                                <input
                                                    type="range"
                                                    min={field.min}
                                                    max={field.max}
                                                    step="1"
                                                    value={settings.sensitivity[field.key]}
                                                    onChange={(event) => handleSensitivityChange(field.key, event.target.value)}
                                                />
                                            </label>
                                        ))}
                                    </div>
                                </section>
                            </GlowEffect>
                            <GlowEffect className="mobile-controls-page__panel__glow-effect">
                                <section className="mobile-controls-page__panel mobile-controls-page__panel--wide">
                                    <h2>{t('gameControls.mobile.gesturesTitle')}</h2>
                                    <div className="mobile-controls-page__gesture-list">
                                        {gestureOrder.map((gesture) => (
                                            <div className="mobile-controls-page__gesture-row" key={gesture}>
                                                <span>{t(`gameControls.mobile.gestureLabels.${gesture}`)}</span>
                                                <CustomSelect
                                                    value={settings.gestureActions[gesture]}
                                                    options={actionOptions}
                                                    onChange={(action) => handleGestureActionChange(gesture, action)}
                                                    menuPlacement="top"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </GlowEffect>
                        </> 
                    ) : null}
                </div>
            </div>
        </section>
    )
}

export default MobileControlsPage
