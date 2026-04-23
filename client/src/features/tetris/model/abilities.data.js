export const ABILITY_CHOICE_DURATION_MS = 50000000
export const ABILITY_CHOICE_COUNT = 3

export const ABILITIES = [
    {
        id: 'speed_surge',
        label: 'Overclock',
        title: 'Speed Surge',
        description: 'Opponent pieces fall much faster for a short time.',
        icon: 'fa-gauge-high',
        visual: 'speed',
    },
    {
        id: 'darkness',
        label: 'Blackout',
        title: 'Darkness',
        description: 'Covers most of the opponent board with a dark veil.',
        icon: 'fa-moon',
        visual: 'darkness',
    },
    {
        id: 'garbage_rain',
        label: 'Garbage Rain',
        title: 'Random Blocks',
        description: 'Drops a few messy blocks into the opponent board.',
        icon: 'fa-cubes',
        visual: 'garbage',
    },
    {
        id: 'controls_swap',
        label: 'Input Scramble',
        title: 'Swapped Controls',
        description: 'Temporarily reverses the opponent movement controls.',
        icon: 'fa-shuffle',
        visual: 'controls',
    },
    {
        id: 'fog_piece',
        label: 'Blind Next',
        title: 'Hidden Preview',
        description: 'Hides the opponent next piece preview.',
        icon: 'fa-eye-slash',
        visual: 'fog',
    },
    {
        id: 'gravity_lock',
        label: 'Heavy Gravity',
        title: 'Sticky Drop',
        description: 'Makes soft correction harder after a piece starts falling.',
        icon: 'fa-weight-hanging',
        visual: 'gravity',
    },
]

export function getRandomDebuffs(count = ABILITY_CHOICE_COUNT, random = Math.random) {
    return [...ABILITIES]
        .sort(() => random() - 0.5)
        .slice(0, Math.min(count, ABILITIES.length))
}
