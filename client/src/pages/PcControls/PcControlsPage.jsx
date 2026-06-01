import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import {
    DEFAULT_PC_CONTROL_SETTINGS,
    PC_CONTROL_ACTION_ORDER,
    formatKeyCode,
    loadPcControlSettings,
    savePcControlSettings,
} from '@/features/tetris/model/pcControls.js'
import notify from '@/utils/Notifications'

import './PcControlsPage.css'
import GlowEffect from '@/shared/ui/GlowEffect'

const PcControlsPage = () => {
    const navigate = useNavigate()
    const { t } = useTranslation()
    const [savedSettings, setSavedSettings] = useState(() => loadPcControlSettings())
    const [draftBindings, setDraftBindings] = useState(() => loadPcControlSettings().bindings)
    const [listeningAction, setListeningAction] = useState(null)

    useEffect(() => {
        if (!listeningAction) {
            return undefined
        }

        const handleKeyDown = (event) => {
            event.preventDefault()
            event.stopPropagation()

            const nextCode = event.code

            setDraftBindings((currentBindings) => (
                PC_CONTROL_ACTION_ORDER.reduce((bindings, action) => {
                    bindings[action] = action === listeningAction
                        ? [nextCode]
                        : (currentBindings[action] || []).filter((code) => code !== nextCode)

                    return bindings
                }, {})
            ))
            setListeningAction(null)
        }

        window.addEventListener('keydown', handleKeyDown, { capture: true })

        return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
    }, [listeningAction])

    const handleListenStart = (action) => {
        setListeningAction(action)
        setDraftBindings((currentBindings) => ({
            ...currentBindings,
            [action]: [],
        }))
    }

    const handleReset = () => {
        setDraftBindings(DEFAULT_PC_CONTROL_SETTINGS.bindings)
        setListeningAction(null)
    }

    const handleSave = () => {
        const emptyAction = PC_CONTROL_ACTION_ORDER.find((action) => !draftBindings[action]?.length)

        if (emptyAction) {
            notify(t('gameControls.pc.assignWarning', { action: getPcActionLabel(emptyAction, t) }), 'warning')
            return
        }

        const nextSettings = savePcControlSettings({
            ...savedSettings,
            bindings: draftBindings,
        })
        const changedActions = PC_CONTROL_ACTION_ORDER.filter((action) => (
            (savedSettings.bindings[action] || []).join('|') !== (nextSettings.bindings[action] || []).join('|')
        ))

        setSavedSettings(nextSettings)
        setDraftBindings(nextSettings.bindings)

        if (changedActions.length === 0) {
            notify(t('gameControls.pc.noChanges'), 'info')
            return
        }

        changedActions.forEach((action) => {
            notify(
                t('gameControls.pc.assigned', {
                    action: getPcActionLabel(action, t),
                    key: formatPcKeyCode(nextSettings.bindings[action][0], t),
                }),
                'success'
            )
        })
    }

    return (
        <section className="section pc-controls-page">
            <div className="container pc-controls-page__container">
                <GlowEffect>
                    <header className="pc-controls-page__topbar">
                        <button className="pc-controls-page__back" type="button" onClick={() => navigate(-1)} aria-label={t('gameControls.common.back')}>
                            <i className="fas fa-arrow-left"></i>
                        </button>
                        <div>
                            <p className="pc-controls-page__eyebrow">{t('gameControls.common.controlsEyebrow')}</p>
                            <h1>{t('gameControls.pc.title')}</h1>
                        </div>
                    </header>
                </GlowEffect>
                <GlowEffect>
                    <section className="pc-controls-page__panel">
                        <div className="pc-controls-page__list">
                            {PC_CONTROL_ACTION_ORDER.map((action) => (
                                <div className="pc-controls-page__row" key={action}>
                                    <span>{getPcActionLabel(action, t)}</span>
                                    <button
                                        type="button"
                                        className={`pc-controls-page__key ${listeningAction === action ? 'is-listening' : ''}`}
                                        onClick={() => handleListenStart(action)}
                                    >
                                        {listeningAction === action
                                            ? t('gameControls.pc.listen')
                                            : (draftBindings[action] || []).map((code) => formatPcKeyCode(code, t)).join(' / ') || t('gameControls.pc.unassigned')}
                                    </button>
                                </div>
                            ))}
                        </div>

                        <div className="pc-controls-page__actions">
                            <button className="button pc-controls-page__save" type="button" onClick={handleSave}>
                                <i className="fas fa-save"></i>
                                {t('gameControls.pc.save')}
                            </button>
                            <button className="button pc-controls-page__reset" type="button" onClick={handleReset}>
                                <i className="fas fa-rotate-left"></i>
                                {t('gameControls.pc.reset')}
                            </button>
                        </div>
                    </section>
                </GlowEffect>
            </div>
        </section>
    )
}

const getPcActionLabel = (action, t) => t(`gameControls.pc.actions.${action}`)

const formatPcKeyCode = (code, t) => {
    if (!code) {
        return t('gameControls.pc.unassigned')
    }

    if (code === 'Space') {
        return t('gameControls.pc.keys.space')
    }

    return formatKeyCode(code)
}

export default PcControlsPage
