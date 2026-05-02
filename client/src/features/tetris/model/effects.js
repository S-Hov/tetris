export const EFFECT_TYPES = {
    SPEED_X2: 'speed_x2_for_4s',
    DARKNESS: 'darkness',
    GARBAGE_RAIN: 'garbage_rain',
    CONTROLS_SWAP: 'controls_swap',
    FOG_PIECE: 'fog_piece',
    GRAVITY_LOCK: 'gravity_lock',
    SCREEN_SHAKE: 'screen_shake',
    RANDOM_ROTATION: 'random_rotation',
    STICKY_WALLS: 'sticky_walls',
    DELAY_INPUT: 'delay_input',
    INVISIBLE_CELLS: 'invisible_cells',
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
