import { getEffectImplementation } from './registry.js'

const getEffectKey = (effect) => effect?.effectKey || effect?.type || effect?.id || null
const getNow = (options) => Number(options?.now) || Date.now()

export const removeExpiredEffects = (state, options = {}) => {
    const now = getNow(options)
    const activeEffects = state.activeEffects || []
    const nextActiveEffects = activeEffects.filter((effect) => effect.expiresAt > now)

    if (nextActiveEffects.length === activeEffects.length) {
        return state
    }

    return {
        ...state,
        activeEffects: nextActiveEffects,
    }
}

export const applyIncomingEffect = (state, incomingEffect, options = {}) => {
    const effectKey = getEffectKey(incomingEffect)
    const implementation = getEffectImplementation(effectKey)

    if (!effectKey || !implementation) {
        console.warn(`Unsupported Tetris effect ignored: ${effectKey || 'unknown'}`)
        return state
    }

    const now = getNow(options)
    const durationMs = Math.max(0, Number(incomingEffect.durationMs) || 0)
    const parameters = implementation.normalizeParameters?.(incomingEffect.parameters) || {}
    const effect = {
        effectKey,
        type: effectKey,
        durationMs,
        expiresAt: now + durationMs,
        parameters,
        sourceSocketId: incomingEffect.sourceSocketId || null,
    }
    const timedIntervalMs = implementation.timedIntervalMs?.(effect)

    if (timedIntervalMs) {
        effect.nextRunAt = now + timedIntervalMs
    }

    const activeEffects = options.replaceActiveEffects
        ? []
        : (state.activeEffects || []).filter(
            (item) => item.expiresAt > now && getEffectKey(item) !== effectKey
        )
    const nextState = {
        ...state,
        activeEffects: [...activeEffects, effect],
    }

    return implementation.apply?.(nextState, effect, options) || nextState
}

export const getEffectActionDelay = (state, action) => (
    (state.activeEffects || []).reduce((delayMs, effect) => {
        const implementation = getEffectImplementation(getEffectKey(effect))
        const result = implementation?.beforeAction?.({ action, effect, state })

        return Math.max(delayMs, Number(result?.delayMs) || 0)
    }, 0)
)

export const applyActionWithEffects = (state, action, executeAction, options = {}) => {
    const cleanedState = removeExpiredEffects(state, options)
    let preparedState = cleanedState
    let preparedAction = action
    let blocked = false
    let feedback = null
    let feedbackEffectKey = null

    for (const effect of cleanedState.activeEffects || []) {
        const implementation = getEffectImplementation(getEffectKey(effect))
        const result = implementation?.beforeAction?.({
            action: preparedAction,
            effect,
            state: preparedState,
        })

        if (result?.state) {
            preparedState = result.state
        }

        if (result?.action) {
            preparedAction = result.action
        }

        blocked ||= Boolean(result?.blocked)

        if (result?.feedback) {
            feedback = result.feedback
            feedbackEffectKey = getEffectKey(effect)
        }
    }

    if (blocked) {
        return {
            ...preparedState,
            effectFeedback: {
                effectKey: feedbackEffectKey,
                sequence: (preparedState.effectFeedback?.sequence || 0) + 1,
                type: feedback || 'blocked',
            },
        }
    }

    const previousState = preparedState
    let nextState = executeAction(preparedState, preparedAction)

    for (const effect of preparedState.activeEffects || []) {
        const implementation = getEffectImplementation(getEffectKey(effect))

        nextState = implementation?.afterAction?.({
            action: preparedAction,
            effect,
            nextState,
            previousState,
        }) || nextState
    }

    return nextState
}

export const applyEffectModifiers = (state) => {
    const modifiedState = (state.activeEffects || []).reduce((derivedState, effect) => {
        const implementation = getEffectImplementation(getEffectKey(effect))

        return implementation?.modifyDerivedState?.(derivedState, effect) || derivedState
    }, state)
    const speedMultiplier = modifiedState.effectSpeedMultiplier || 1
    const { effectSpeedMultiplier, ...publicState } = modifiedState
    void effectSpeedMultiplier

    return {
        ...publicState,
        speed: speedMultiplier > 1
            ? Math.max(50, Math.floor(state.speed / speedMultiplier))
            : state.speed,
    }
}

export const hasTimedEffects = (state) => (
    (state.activeEffects || []).some((effect) => (
        Boolean(getEffectImplementation(getEffectKey(effect))?.timedAction)
    ))
)

export const runTimedEffects = (state, context = {}) => {
    const now = getNow(context)
    let nextState = removeExpiredEffects(state, { now })
    let activeEffects = nextState.activeEffects || []
    let didRun = nextState !== state

    for (const effect of activeEffects) {
        const implementation = getEffectImplementation(getEffectKey(effect))

        if (!implementation?.timedAction || !effect.nextRunAt || effect.nextRunAt > now) {
            continue
        }

        nextState = implementation.timedAction(nextState, effect, context) || nextState
        didRun = true
        const intervalMs = implementation.timedIntervalMs?.(effect)

        activeEffects = (nextState.activeEffects || activeEffects).map((item) => (
            getEffectKey(item) === getEffectKey(effect)
                ? { ...item, nextRunAt: now + intervalMs }
                : item
        ))
        nextState = {
            ...nextState,
            activeEffects,
        }
    }

    return didRun ? nextState : state
}

export const getEffectPresentationState = (state) => (
    (state.activeEffects || []).reduce((presentationState, effect) => {
        const implementation = getEffectImplementation(getEffectKey(effect))
        const presentation = typeof implementation?.presentation === 'function'
            ? implementation.presentation(effect)
            : implementation?.presentation

        return {
            ...presentationState,
            ...(presentation || {}),
        }
    }, {})
)

export const getEffectPresentation = (effect) => {
    const implementation = getEffectImplementation(getEffectKey(effect))

    return typeof implementation?.presentation === 'function'
        ? implementation.presentation(effect)
        : implementation?.presentation || null
}
