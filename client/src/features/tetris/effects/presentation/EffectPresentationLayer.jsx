import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { getLocalizedEffectText } from '../catalog.js'
import { getEffectPresentation } from '../runtime.js'
import EffectScreenLayer from './EffectScreenLayer.jsx'

import './effect-presentation.css'

const IMPACT_DURATION_MS = 1650

const playFeedbackAudio = (presentation, feedback, playSynthEffect) => {
    const feedbackSequence = presentation.audio?.feedbackSequence

    if (feedbackSequence) {
        const events = Array.isArray(feedback?.[feedbackSequence.source])
            ? feedback[feedbackSequence.source]
            : [{}]
        const maxEvents = Number(feedbackSequence.maxEvents) || events.length
        const timeoutIds = events.slice(0, maxEvents).map((event, index) => (
            window.setTimeout(() => {
                playSynthEffect(feedbackSequence, {
                    volume: feedbackSequence.volume,
                })
            }, Math.max(0, Number(event.delayMs) || index * 80))
        ))

        return () => timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId))
    }

    if (presentation.audio?.feedback) {
        playSynthEffect(presentation.audio.feedback, {
            volume: presentation.audio.feedback.volume,
        })
    }

    return undefined
}

const EffectPresentationLayer = ({
    activeEffects = [],
    catalog = [],
    feedback = null,
    playSynthEffect,
}) => {
    const { i18n } = useTranslation()
    const currentLanguage = i18n.language === 'en' ? 'en' : 'ru'
    const [impact, setImpact] = useState(null)
    const [now, setNow] = useState(() => Date.now())
    const previousEffectsRef = useRef(new Map())
    const previousFeedbackSequenceRef = useRef(null)
    const catalogByKey = useMemo(
        () => new Map(catalog.map((effect) => [effect.effectKey, effect])),
        [catalog]
    )

    useEffect(() => {
        const intervalId = window.setInterval(() => setNow(Date.now()), 100)

        return () => window.clearInterval(intervalId)
    }, [])

    useEffect(() => {
        const previousEffects = previousEffectsRef.current

        activeEffects.forEach((effect) => {
            const previousExpiresAt = previousEffects.get(effect.effectKey)

            if (!previousExpiresAt || previousExpiresAt !== effect.expiresAt) {
                const presentation = getEffectPresentation(effect)
                const catalogEffect = catalogByKey.get(effect.effectKey)

                if (presentation) {
                    setImpact({
                        catalogEffect,
                        effect,
                        presentation,
                        sequence: `${effect.effectKey}-${effect.expiresAt}`,
                    })

                    if (presentation.audio?.apply) {
                        playSynthEffect(presentation.audio.apply, {
                            volume: presentation.audio.apply.volume,
                        })
                    }
                }
            }
        })

        previousEffectsRef.current = new Map(
            activeEffects.map((effect) => [effect.effectKey, effect.expiresAt])
        )
    }, [activeEffects, catalogByKey, playSynthEffect])

    useEffect(() => {
        if (!impact) {
            return undefined
        }

        const timeoutId = window.setTimeout(() => setImpact(null), IMPACT_DURATION_MS)

        return () => window.clearTimeout(timeoutId)
    }, [impact])

    useEffect(() => {
        const feedbackSequenceKey = feedback?.sequence
            ? `${feedback.effectKey || 'unknown'}-${feedback.sequence}`
            : null

        if (!feedbackSequenceKey || feedbackSequenceKey === previousFeedbackSequenceRef.current) {
            return
        }

        previousFeedbackSequenceRef.current = feedbackSequenceKey
        const effect = activeEffects.find((item) => item.effectKey === feedback.effectKey) ||
            { effectKey: feedback.effectKey }
        const presentation = getEffectPresentation(effect)

        if (presentation?.audio) {
            return playFeedbackAudio(presentation, feedback, playSynthEffect)
        }

        return undefined
    }, [activeEffects, feedback, playSynthEffect])

    return (
        <>
            <EffectScreenLayer activeEffects={activeEffects} />
            <ActiveEffectsBar
                activeEffects={activeEffects}
                catalogByKey={catalogByKey}
                currentLanguage={currentLanguage}
                now={now}
            />
            {impact ? <EffectImpact currentLanguage={currentLanguage} impact={impact} /> : null}
        </>
    )
}

const ActiveEffectsBar = ({ activeEffects, catalogByKey, currentLanguage, now }) => {
    if (activeEffects.length === 0) {
        return null
    }

    return (
        <aside className="active-effects-bar" aria-label="Активные эффекты">
            {activeEffects.map((effect) => {
                const presentation = getEffectPresentation(effect)
                const catalogEffect = catalogByKey.get(effect.effectKey)
                const localized = getLocalizedEffectText(catalogEffect, currentLanguage)
                const remainingMs = Math.max(0, effect.expiresAt - now)
                const progress = effect.durationMs > 0
                    ? Math.min(1, remainingMs / effect.durationMs)
                    : 0

                return (
                    <article
                        className={`active-effect-chip active-effect-chip--${presentation?.theme || 'default'}`}
                        key={effect.effectKey}
                        style={{
                            '--effect-accent': presentation?.accent || '#6ef7ff',
                            '--effect-progress': progress,
                        }}
                    >
                        <span className="active-effect-chip__icon">
                            <i className={`fa-solid ${presentation?.icon || catalogEffect?.icon || 'fa-bolt'}`} />
                        </span>
                        <span className="active-effect-chip__copy">
                            <strong>{localized.title || presentation?.label || effect.effectKey}</strong>
                            <small>
                                {currentLanguage === 'en'
                                    ? `${Math.max(0, Math.ceil(remainingMs / 1000))} sec.`
                                    : `${Math.max(0, Math.ceil(remainingMs / 1000))} сек.`}
                            </small>
                        </span>
                    </article>
                )
            })}
        </aside>
    )
}

const EffectImpact = ({ currentLanguage, impact }) => {
    const { catalogEffect, presentation } = impact
    const localized = getLocalizedEffectText(catalogEffect, currentLanguage)

    return (
        <div
            className={`effect-impact effect-impact--${presentation.theme || 'default'}`}
            key={impact.sequence}
            style={{ '--effect-accent': presentation.accent || '#6ef7ff' }}
            role="status"
            aria-live="assertive"
        >
            <div className="effect-impact__backdrop" />
            <div className="effect-impact__scanlines" />
            <div className="effect-impact__particles" aria-hidden="true">
                {Array.from({ length: 18 }, (_, index) => (
                    <span key={index} style={{ '--particle-index': index }} />
                ))}
            </div>
            <div className="effect-impact__content">
                <span className="effect-impact__icon">
                    <i className={`fa-solid ${presentation.icon || catalogEffect?.icon || 'fa-bolt'}`} />
                </span>
                <div className="effect-impact__copy">
                    <span className="effect-impact__eyebrow">
                        {currentLanguage === 'en' ? 'Enemy effect' : 'Вражеский эффект'}
                    </span>
                    <strong>{localized.title || presentation.label}</strong>
                    <small>
                        {localized.description || (
                            currentLanguage === 'en'
                                ? 'Field rules have changed'
                                : 'Правила поля изменены'
                        )}
                    </small>
                </div>
            </div>
        </div>
    )
}

export default EffectPresentationLayer
