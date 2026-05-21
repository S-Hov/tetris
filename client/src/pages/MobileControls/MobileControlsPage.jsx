import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import CustomSelect from '@/shared/ui/CustomSelect'
import {
    DEFAULT_MOBILE_CONTROL_SETTINGS,
    MOBILE_CONTROL_METHODS,
    TOUCH_ACTION_LABELS,
    TOUCH_ACTIONS,
    TOUCH_GESTURE_LABELS,
    TOUCH_GESTURES,
    loadMobileControlSettings,
    saveMobileControlSettings,
} from '@/features/tetris/model/mobileControls.js'

import './MobileControlsPage.css'
import GlowEffect from '@/shared/ui/GlowEffect'

const methodOptions = [
    {
        value: MOBILE_CONTROL_METHODS.GESTURES,
        label: 'Жесты',
        icon: 'fas fa-hand-pointer',
    },
    {
        value: MOBILE_CONTROL_METHODS.BUTTONS,
        label: 'Кнопки',
        icon: 'fas fa-gamepad',
        description: 'Кнопочное управление добавим позже.',
    },
]

const actionOptions = Object.values(TOUCH_ACTIONS).map((action) => ({
    value: action,
    label: TOUCH_ACTION_LABELS[action],
}))

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
    const [settings, setSettings] = useState(() => loadMobileControlSettings())
    const isGestures = settings.method === MOBILE_CONTROL_METHODS.GESTURES

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
                        aria-label="Назад"
                        onClick={() => navigate(-1)}
                    >
                        <i className="fas fa-arrow-left"></i>
                    </button>
                    <div>
                        <span>Настройки управления</span>
                        <h1>Управление для мобильных</h1>
                    </div>
                    <button className="mobile-controls-page__reset" type="button" onClick={handleReset}>
                        Сбросить
                    </button>
                </header>

                <div className="mobile-controls-page__grid">
                    <GlowEffect className="mobile-controls-page__panel__glow-effect">
                        <section className="mobile-controls-page__panel">
                            <h2>Способ управления</h2>
                            <CustomSelect
                                value={settings.method}
                                options={methodOptions}
                                onChange={handleMethodChange}
                            />
                            {settings.method === MOBILE_CONTROL_METHODS.BUTTONS ? (
                                <p className="mobile-controls-page__note">
                                    Режим кнопок уже сохраняется, но сами игровые кнопки пока не добавлены.
                                </p>
                            ) : null}
                        </section>
                    </GlowEffect>

                    {isGestures ? (
                        <>
                            <GlowEffect className="mobile-controls-page__panel__glow-effect">
                                <section className="mobile-controls-page__panel">
                                    <h2>Чувствительность</h2>
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
                                    <h2>Назначение жестов</h2>
                                    <div className="mobile-controls-page__gesture-list">
                                        {gestureOrder.map((gesture) => (
                                            <div className="mobile-controls-page__gesture-row" key={gesture}>
                                                <span>{TOUCH_GESTURE_LABELS[gesture]}</span>
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
