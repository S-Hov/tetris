export const ABILITY_CHOICE_DURATION_MS = 50000000
export const ABILITY_CHOICE_COUNT = 3
export const SOLO_DEBUFF_INTERVAL_SECONDS = 30

export const ABILITY_IDS = {
    SPEED_X2_FOR_4S: 'speed_x2_for_4s',
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

export const ABILITIES = [
    {
        id: ABILITY_IDS.SPEED_X2_FOR_4S,
        enabled: true,
        label: 'Overclock',
        title: 'Speed Surge',
        description: 'Opponent pieces fall much faster for a short time.',
        icon: 'fa-gauge-high',
        visual: 'speed',
    },
    {
        id: ABILITY_IDS.DARKNESS,
        enabled: true,
        label: 'Blackout',
        title: 'Darkness',
        description: 'Covers most of the opponent board with a dark veil.',
        icon: 'fa-moon',
        visual: 'darkness',
    },
    {
        id: ABILITY_IDS.GARBAGE_RAIN,
        enabled: true,
        label: 'Garbage Rain',
        title: 'Random Blocks',
        description: 'Drops a few messy blocks into the opponent board.',
        icon: 'fa-cubes',
        visual: 'garbage',
    },
    {
        id: ABILITY_IDS.CONTROLS_SWAP,
        enabled: true,
        label: 'Input Scramble',
        title: 'Swapped Controls',
        description: 'Temporarily reverses the opponent movement controls.',
        icon: 'fa-shuffle',
        visual: 'controls',
    },
    {
        id: ABILITY_IDS.FOG_PIECE,
        enabled: true,
        label: 'Blind Next',
        title: 'Hidden Preview',
        description: 'Hides the opponent next piece preview.',
        icon: 'fa-eye-slash',
        visual: 'fog',
    },
    {
        id: ABILITY_IDS.GRAVITY_LOCK,
        enabled: true,
        label: 'Heavy Gravity',
        title: 'Sticky Drop',
        description: 'Makes soft correction harder after a piece starts falling.',
        icon: 'fa-weight-hanging',
        visual: 'gravity',
    },
    {
        id: ABILITY_IDS.SCREEN_SHAKE,
        enabled: true,
        label: 'Quake',
        title: 'Screen Shake',
        description: 'Makes the opponent board jitter for a short burst.',
        icon: 'fa-wave-square',
        visual: 'shake',
    },
    {
        id: ABILITY_IDS.RANDOM_ROTATION,
        enabled: true,
        label: 'Spin Glitch',
        title: 'Random Rotation',
        description: 'Occasionally rotates the opponent piece on its own.',
        icon: 'fa-rotate',
        visual: 'rotation',
    },
    {
        id: ABILITY_IDS.STICKY_WALLS,
        enabled: true,
        label: 'Wall Glue',
        title: 'Sticky Walls',
        description: 'Locks horizontal movement when the opponent touches a wall.',
        icon: 'fa-grip-lines-vertical',
        visual: 'sticky',
    },
    {
        id: ABILITY_IDS.DELAY_INPUT,
        enabled: true,
        label: 'Lag Spike',
        title: 'Delayed Input',
        description: 'Applies opponent controls with a small delay.',
        icon: 'fa-hourglass-half',
        visual: 'delay',
    },
    {
        id: ABILITY_IDS.INVISIBLE_CELLS,
        enabled: true,
        label: 'Ghost Blocks',
        title: 'Invisible Cells',
        description: 'Makes some locked blocks visually disappear.',
        icon: 'fa-eye-low-vision',
        visual: 'invisible',
    },
]

let runtimeAbilities = ABILITIES

export const ABILITY_EFFECTS = {
    [ABILITY_IDS.SPEED_X2_FOR_4S]: {
        type: ABILITY_IDS.SPEED_X2_FOR_4S,
        durationMs: 4000,
    },
    [ABILITY_IDS.DARKNESS]: {
        type: ABILITY_IDS.DARKNESS,
        durationMs: 10000,
    },
    [ABILITY_IDS.GARBAGE_RAIN]: {
        type: ABILITY_IDS.GARBAGE_RAIN,
        durationMs: 1,
    },
    [ABILITY_IDS.CONTROLS_SWAP]: {
        type: ABILITY_IDS.CONTROLS_SWAP,
        durationMs: 5000,
    },
    [ABILITY_IDS.FOG_PIECE]: {
        type: ABILITY_IDS.FOG_PIECE,
        durationMs: 6000,
    },
    [ABILITY_IDS.GRAVITY_LOCK]: {
        type: ABILITY_IDS.GRAVITY_LOCK,
        durationMs: 3500,
    },
    [ABILITY_IDS.SCREEN_SHAKE]: {
        type: ABILITY_IDS.SCREEN_SHAKE,
        durationMs: 3500,
    },
    [ABILITY_IDS.RANDOM_ROTATION]: {
        type: ABILITY_IDS.RANDOM_ROTATION,
        durationMs: 5000,
    },
    [ABILITY_IDS.STICKY_WALLS]: {
        type: ABILITY_IDS.STICKY_WALLS,
        durationMs: 5000,
    },
    [ABILITY_IDS.DELAY_INPUT]: {
        type: ABILITY_IDS.DELAY_INPUT,
        durationMs: 5000,
    },
    [ABILITY_IDS.INVISIBLE_CELLS]: {
        type: ABILITY_IDS.INVISIBLE_CELLS,
        durationMs: 6000,
    },
}

export function getRandomDebuffs(count = ABILITY_CHOICE_COUNT, random = Math.random) {
    const enabledAbilities = runtimeAbilities.filter((ability) => ability.enabled)

    return enabledAbilities
        .slice()
        .sort(() => random() - 0.5)
        .slice(0, Math.min(count, enabledAbilities.length))
}

export function getAbilityEffect(abilityId) {
    const runtimeAbility = runtimeAbilities.find((ability) => ability.id === abilityId)

    if (runtimeAbility) {
        return {
            type: runtimeAbility.id,
            durationMs: runtimeAbility.durationMs,
        }
    }

    return ABILITY_EFFECTS[abilityId] || null
}

export function setRuntimeAbilities(abilities = []) {
    if (!Array.isArray(abilities) || abilities.length === 0) {
        runtimeAbilities = ABILITIES
        return runtimeAbilities
    }

    runtimeAbilities = abilities.map((ability) => ({
        id: ability.id || ability.key,
        enabled: ability.enabled !== false,
        label: ability.label || ability.title || ability.id,
        title: ability.title || ability.label || ability.id,
        description: ability.description || '',
        icon: ability.icon || 'fa-bolt',
        imageUrl: normalizeAssetUrl(ability.imageUrl || ability.image_url || ''),
        visual: ability.visual || 'default',
        durationMs: Number(ability.durationMs ?? ability.duration_ms) || 0,
    })).filter((ability) => ability.id)

    return runtimeAbilities
}

function normalizeAssetUrl(value) {
    if (!value) return ''
    if (/^(https?:)?\/\//i.test(value) || String(value).startsWith('data:')) return value

    const baseUrl = import.meta.env.VITE_API_URL || (
        typeof window !== 'undefined' && window.location.hostname
            ? `http://${window.location.hostname}:8880`
            : 'http://127.0.0.1:8880'
    )

    return `${baseUrl}${String(value).startsWith('/') ? value : `/${value}`}`
}
