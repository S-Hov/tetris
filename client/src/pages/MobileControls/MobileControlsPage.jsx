import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import CustomSelect from '@/shared/ui/CustomSelect'
import {
    DEFAULT_MOBILE_CONTROL_SETTINGS,
    MOBILE_BUTTON_ORDER,
    MOBILE_CONTROL_METHODS,
    TOUCH_ACTIONS,
    TOUCH_GESTURES,
    loadMobileControlSettings,
    saveMobileControlSettings,
} from '@/features/tetris/model/mobileControls.js'

import './MobileControlsPage.css'
import GlowEffect from '@/shared/ui/GlowEffect'

const DEFAULT_SCREEN_SIZE = {
    width: 390,
    height: 844,
}

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

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
        labelKey: 'minSwipe',
        unit: 'px',
        min: 8,
        max: 80,
    },
    {
        key: 'repeatStep',
        labelKey: 'repeatStep',
        unit: 'px',
        min: 12,
        max: 96,
    },
    {
        key: 'tapMaxTime',
        labelKey: 'tapMaxTime',
        unit: 'ms',
        min: 80,
        max: 360,
    },
    {
        key: 'tapMaxMove',
        labelKey: 'tapMaxMove',
        unit: 'px',
        min: 4,
        max: 32,
    },
]

const buttonFields = [
    {
        key: 'x',
        labelKey: 'x',
        unit: '%',
        min: 4,
        max: 96,
    },
    {
        key: 'y',
        labelKey: 'y',
        unit: '%',
        min: 12,
        max: 92,
    },
    {
        key: 'size',
        labelKey: 'size',
        unit: 'px',
        min: 44,
        max: 86,
    },
]

const MobileControlsPage = () => {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [settings, setSettings] = useState(() => loadMobileControlSettings())
    const [selectedButtonId, setSelectedButtonId] = useState(null)
    const [screenSize, setScreenSize] = useState(DEFAULT_SCREEN_SIZE)
    const [previewScale, setPreviewScale] = useState(1)
    const [showAdvancedSettings, setShowAdvancedSettings] = useState(false)
    const previewRef = useRef(null)
    const dragStateRef = useRef(null)
    const isGestures = settings.method === MOBILE_CONTROL_METHODS.GESTURES
    const isButtons = settings.method === MOBILE_CONTROL_METHODS.BUTTONS
    const selectedButton = selectedButtonId ? settings.buttonControls.layout[selectedButtonId] : null
    const previewStyle = useMemo(() => ({
        '--mobile-preview-opacity': settings.buttonControls.opacity / 100,
        '--mobile-preview-width': `${screenSize.width}px`,
        '--mobile-preview-scale': previewScale,
        aspectRatio: `${screenSize.width} / ${screenSize.height}`,
    }), [previewScale, screenSize.height, screenSize.width, settings.buttonControls.opacity])
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

    const handleButtonControlChange = (buttonId, key, value) => {
        updateSettings({
            ...settings,
            buttonControls: {
                ...settings.buttonControls,
                layout: {
                    ...settings.buttonControls.layout,
                    [buttonId]: {
                        ...settings.buttonControls.layout[buttonId],
                        [key]: key === 'label' || key === 'action' ? value : Number(value),
                    },
                },
            },
        })
    }

    const handleButtonPositionChange = (buttonId, x, y) => {
        updateSettings({
            ...settings,
            buttonControls: {
                ...settings.buttonControls,
                layout: {
                    ...settings.buttonControls.layout,
                    [buttonId]: {
                        ...settings.buttonControls.layout[buttonId],
                        x: Number(x.toFixed(1)),
                        y: Number(y.toFixed(1)),
                    },
                },
            },
        })
    }

    const handleButtonOpacityChange = (value) => {
        updateSettings({
            ...settings,
            buttonControls: {
                ...settings.buttonControls,
                opacity: Number(value),
            },
        })
    }

    const handleReset = () => {
        updateSettings(DEFAULT_MOBILE_CONTROL_SETTINGS)
        setSelectedButtonId(null)
        setShowAdvancedSettings(false)
    }

    useEffect(() => {
        const updateScreen = () => {
            if (typeof window === 'undefined') {
                return
            }

            setScreenSize({
                width: Math.round(window.innerWidth || DEFAULT_SCREEN_SIZE.width),
                height: Math.round(window.innerHeight || DEFAULT_SCREEN_SIZE.height),
            })
        }

        updateScreen()
        window.addEventListener('resize', updateScreen)
        window.addEventListener('orientationchange', updateScreen)

        return () => {
            window.removeEventListener('resize', updateScreen)
            window.removeEventListener('orientationchange', updateScreen)
        }
    }, [])

    useEffect(() => {
        const preview = previewRef.current

        if (!preview || typeof ResizeObserver === 'undefined') {
            return undefined
        }

        const observer = new ResizeObserver(([entry]) => {
            const width = entry.contentRect.width
            setPreviewScale(width > 0 ? width / screenSize.width : 1)
        })

        observer.observe(preview)

        return () => observer.disconnect()
    }, [screenSize.width])

    const updateDraggedButtonPosition = (buttonId, event) => {
        const preview = previewRef.current

        if (!preview) {
            return
        }

        const rect = preview.getBoundingClientRect()
        const x = clamp(((event.clientX - rect.left) / rect.width) * 100, 4, 96)
        const y = clamp(((event.clientY - rect.top) / rect.height) * 100, 8, 96)

        handleButtonPositionChange(buttonId, x, y)
    }

    const handlePreviewButtonPointerDown = (event, buttonId) => {
        event.preventDefault()
        setSelectedButtonId(buttonId)
        dragStateRef.current = buttonId
        event.currentTarget.setPointerCapture?.(event.pointerId)
        updateDraggedButtonPosition(buttonId, event)
    }

    const handlePreviewButtonPointerMove = (event, buttonId) => {
        if (dragStateRef.current !== buttonId) {
            return
        }

        event.preventDefault()
        updateDraggedButtonPosition(buttonId, event)
    }

    const handlePreviewButtonPointerEnd = (event, buttonId) => {
        if (dragStateRef.current !== buttonId) {
            return
        }

        dragStateRef.current = null
        event.currentTarget.releasePointerCapture?.(event.pointerId)
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
                        <div>
                            <p>{t('gameControls.common.controlsEyebrow')}</p>
                            <h1>{t('gameControls.mobile.title')}</h1>
                        </div>
                        <button className="mobile-controls-page__reset" type="button" onClick={handleReset}>
                            {t('gameControls.mobile.reset')}
                        </button>
                    </div>
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
                                                    {t(`gameControls.mobile.sensitivityFields.${field.labelKey}`)}
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

                    {isButtons ? (
                        <>
                            <GlowEffect className="mobile-controls-page__panel__glow-effect">
                                <section className="mobile-controls-page__panel">
                                    <h2>{t('gameControls.mobile.buttonsPreviewTitle')}</h2>
                                    <div
                                        ref={previewRef}
                                        className="mobile-controls-page__phone-preview"
                                        style={previewStyle}
                                    >
                                        {MOBILE_BUTTON_ORDER.map((buttonId) => {
                                            const buttonConfig = settings.buttonControls.layout[buttonId]

                                            return (
                                                <button
                                                    className={[
                                                        'mobile-controls-page__preview-button',
                                                        selectedButtonId === buttonId ? 'mobile-controls-page__preview-button--active' : '',
                                                    ].filter(Boolean).join(' ')}
                                                    key={buttonId}
                                                    style={{
                                                        '--button-x': `${buttonConfig.x}%`,
                                                        '--button-y': `${buttonConfig.y}%`,
                                                        '--button-size': `${buttonConfig.size * previewScale}px`,
                                                    }}
                                                    type="button"
                                                    aria-label={t(`gameControls.mobile.buttonNames.${buttonId}`)}
                                                    onPointerDown={(event) => handlePreviewButtonPointerDown(event, buttonId)}
                                                    onPointerMove={(event) => handlePreviewButtonPointerMove(event, buttonId)}
                                                    onPointerUp={(event) => handlePreviewButtonPointerEnd(event, buttonId)}
                                                    onPointerCancel={(event) => handlePreviewButtonPointerEnd(event, buttonId)}
                                                >
                                                    {buttonConfig.label}
                                                </button>
                                            )
                                        })}
                                    </div>
                                    <p className="mobile-controls-page__preview-meta">
                                        {t('gameControls.mobile.screenSize', {
                                            width: screenSize.width,
                                            height: screenSize.height,
                                        })}
                                    </p>
                                    <p className="mobile-controls-page__note">
                                        {t('gameControls.mobile.dragHint')}
                                    </p>
                                    <label className="mobile-controls-page__field mobile-controls-page__field--opacity">
                                        <span>
                                            {t('gameControls.mobile.buttonFields.opacity')}
                                            <b>{settings.buttonControls.opacity}%</b>
                                        </span>
                                        <input
                                            type="range"
                                            min="35"
                                            max="100"
                                            step="1"
                                            value={settings.buttonControls.opacity}
                                            onChange={(event) => handleButtonOpacityChange(event.target.value)}
                                        />
                                    </label>
                                </section>
                            </GlowEffect>

                            {selectedButton ? (
                                <GlowEffect className="mobile-controls-page__panel__glow-effect">
                                    <section className="mobile-controls-page__panel">
                                        <h2>{t('gameControls.mobile.selectedButtonTitle')}</h2>
                                        <div className="mobile-controls-page__selected-card">
                                            <div className="mobile-controls-page__button-card-header">
                                                <strong>{t(`gameControls.mobile.buttonNames.${selectedButtonId}`)}</strong>
                                                <input
                                                    type="text"
                                                    maxLength="6"
                                                    value={selectedButton.label}
                                                    aria-label={t('gameControls.mobile.buttonFields.label')}
                                                    onChange={(event) => handleButtonControlChange(selectedButtonId, 'label', event.target.value)}
                                                />
                                            </div>
                                            <CustomSelect
                                                value={selectedButton.action}
                                                options={actionOptions}
                                                onChange={(action) => handleButtonControlChange(selectedButtonId, 'action', action)}
                                                menuPlacement="top"
                                            />
                                            <label className="mobile-controls-page__field">
                                                <span>
                                                    {t('gameControls.mobile.buttonFields.size')}
                                                    <b>{selectedButton.size} px</b>
                                                </span>
                                                <input
                                                    type="range"
                                                    min="44"
                                                    max="86"
                                                    step="1"
                                                    value={selectedButton.size}
                                                    onChange={(event) => handleButtonControlChange(selectedButtonId, 'size', event.target.value)}
                                                />
                                            </label>
                                        </div>
                                        <button
                                            className="mobile-controls-page__advanced-toggle"
                                            type="button"
                                            onClick={() => setShowAdvancedSettings((value) => !value)}
                                        >
                                            {showAdvancedSettings
                                                ? t('gameControls.mobile.hideAdvancedSettings')
                                                : t('gameControls.mobile.showAdvancedSettings')}
                                        </button>
                                    </section>
                                </GlowEffect>
                            ) : (
                                <GlowEffect className="mobile-controls-page__panel__glow-effect">
                                    <section className="mobile-controls-page__panel">
                                        <h2>{t('gameControls.mobile.selectedButtonTitle')}</h2>
                                        <p className="mobile-controls-page__note">
                                            {t('gameControls.mobile.selectButtonHint')}
                                        </p>
                                        <button
                                            className="mobile-controls-page__advanced-toggle"
                                            type="button"
                                            onClick={() => setShowAdvancedSettings((value) => !value)}
                                        >
                                            {showAdvancedSettings
                                                ? t('gameControls.mobile.hideAdvancedSettings')
                                                : t('gameControls.mobile.showAdvancedSettings')}
                                        </button>
                                    </section>
                                </GlowEffect>
                            )}

                            {showAdvancedSettings ? (
                                <GlowEffect className="mobile-controls-page__panel__glow-effect">
                                    <section className="mobile-controls-page__panel mobile-controls-page__panel--wide">
                                        <h2>{t('gameControls.mobile.buttonsLayoutTitle')}</h2>
                                    <div className="mobile-controls-page__button-list">
                                        {MOBILE_BUTTON_ORDER.map((buttonId) => {
                                            const buttonConfig = settings.buttonControls.layout[buttonId]

                                            return (
                                                <article className="mobile-controls-page__button-card" key={buttonId}>
                                                    <div className="mobile-controls-page__button-card-header">
                                                        <strong>{t(`gameControls.mobile.buttonNames.${buttonId}`)}</strong>
                                                        <input
                                                            type="text"
                                                            maxLength="6"
                                                            value={buttonConfig.label}
                                                            aria-label={t('gameControls.mobile.buttonFields.label')}
                                                            onChange={(event) => handleButtonControlChange(buttonId, 'label', event.target.value)}
                                                        />
                                                    </div>
                                                    <CustomSelect
                                                        value={buttonConfig.action}
                                                        options={actionOptions}
                                                        onChange={(action) => handleButtonControlChange(buttonId, 'action', action)}
                                                        menuPlacement="top"
                                                    />
                                                    <div className="mobile-controls-page__button-fields">
                                                        {buttonFields.map((field) => (
                                                            <label className="mobile-controls-page__field" key={field.key}>
                                                                <span>
                                                                    {t(`gameControls.mobile.buttonFields.${field.labelKey}`)}
                                                                    <b>{buttonConfig[field.key]} {field.unit}</b>
                                                                </span>
                                                                <input
                                                                    type="range"
                                                                    min={field.min}
                                                                    max={field.max}
                                                                    step="1"
                                                                    value={buttonConfig[field.key]}
                                                                    onChange={(event) => handleButtonControlChange(buttonId, field.key, event.target.value)}
                                                                />
                                                            </label>
                                                        ))}
                                                    </div>
                                                </article>
                                            )
                                        })}
                                    </div>
                                    </section>
                                </GlowEffect>
                            ) : null}
                        </>
                    ) : null}
                </div>
            </div>
        </section>
    )
}

export default MobileControlsPage
