export const ABILITY_CHOICE_DURATION_MS = 50000000
export const ABILITY_CHOICE_COUNT = 3

export const ABILITY_IDS = {
    SPEED_X2_FOR_4S: 'speed_x2_for_4s',
    DARKNESS: 'darkness',
    GARBAGE_RAIN: 'garbage_rain',
    CONTROLS_SWAP: 'controls_swap',
    FOG_PIECE: 'fog_piece',
    GRAVITY_LOCK: 'gravity_lock',
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
        enabled: false,
        label: 'Garbage Rain',
        title: 'Random Blocks',
        description: 'Drops a few messy blocks into the opponent board.',
        icon: 'fa-cubes',
        visual: 'garbage',
    },
    {
        id: ABILITY_IDS.CONTROLS_SWAP,
        enabled: false,
        label: 'Input Scramble',
        title: 'Swapped Controls',
        description: 'Temporarily reverses the opponent movement controls.',
        icon: 'fa-shuffle',
        visual: 'controls',
    },
    {
        id: ABILITY_IDS.FOG_PIECE,
        enabled: false,
        label: 'Blind Next',
        title: 'Hidden Preview',
        description: 'Hides the opponent next piece preview.',
        icon: 'fa-eye-slash',
        visual: 'fog',
    },
    {
        id: ABILITY_IDS.GRAVITY_LOCK,
        enabled: false,
        label: 'Heavy Gravity',
        title: 'Sticky Drop',
        description: 'Makes soft correction harder after a piece starts falling.',
        icon: 'fa-weight-hanging',
        visual: 'gravity',
    },
]

export function getRandomDebuffs(count = ABILITY_CHOICE_COUNT, random = Math.random) {
    const enabledAbilities = ABILITIES.filter((ability) => ability.enabled)

    return enabledAbilities
        .slice()
        .sort(() => random() - 0.5)
        .slice(0, Math.min(count, enabledAbilities.length))
}
