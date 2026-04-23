export const EFFECT_TYPES = {
    SPEED_X2: 'speed_x2_for_4s',
}

export function addEffect(state, effect) {
    const now = Date.now()

    const filteredEffects = state.activeEffects.filter(
        (item) => item.expiresAt > now && item.type !== effect.type
    )

    return {
        ...state,
        activeEffects: [...filteredEffects, effect],
    }
}

export function removeExpiredEffects(state) {
    const now = Date.now()

    return {
        ...state,
        activeEffects: state.activeEffects.filter((effect) => effect.expiresAt > now),
    }
}

export function hasEffect(state, effectType) {
    return state.activeEffects.some((effect) => effect.type === effectType)
}