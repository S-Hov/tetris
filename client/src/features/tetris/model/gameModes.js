export const GAME_MODE_TYPES = {
    SOLO_CLASSIC: 'solo-classic',
    VERSUS_1V1_EFFECTS: 'versus-1v1-effects',
}

export const GAME_MODE_REGISTRY = {
    [GAME_MODE_TYPES.SOLO_CLASSIC]: {
        id: GAME_MODE_TYPES.SOLO_CLASSIC,
        title: 'Solo mod',
        variant: 'solo',
        category: 'solo',
        features: {
            abilities: false,
            multiplayer: false,
            energy: false,
            opponents: false,
        },
    },
    [GAME_MODE_TYPES.VERSUS_1V1_EFFECTS]: {
        id: GAME_MODE_TYPES.VERSUS_1V1_EFFECTS,
        title: '1v1 Match',
        variant: 'versus',
        category: 'match',
        features: {
            abilities: true,
            multiplayer: true,
            energy: true,
            opponents: true,
        },
    },
}
