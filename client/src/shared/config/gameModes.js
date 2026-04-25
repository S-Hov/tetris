export const PLAY_MODE_KEYS = {
    SOLO: 'solo',
    DUEL_1V1: '1v1',
    TEAM_2V2: '2v2',
    SQUAD_5V5: '5v5',
    ROYALE: 'royale',
}

export const MATCH_PLAY_OPTIONS = {
    RANKED: 'ranked',
    CASUAL: 'casual',
    ROOM: 'room',
}

export const defaultModeSettings = {
    abilitiesEnabled: true,
    specialBlocksEnabled: false,
}

export const modeSelectionCatalog = {
    [PLAY_MODE_KEYS.DUEL_1V1]: {
        key: PLAY_MODE_KEYS.DUEL_1V1,
        title: 'Дуэль 1 VS 1',
        subtitle: 'Сразитесь с соперником в напряжённой битве линий',
        icon: 'fas fa-fist-raised',
        online: '1,234 игроков онлайн',
        roomSupported: true,
        heroLabel: 'Режим 1 VS 1',
        cardMeta: {
            ranked: ['Влияет на рейтинг', '~5-10 мин'],
            casual: ['Без риска', 'Быстрый поиск'],
            room: ['Приватная комната', 'До 2 игроков'],
        },
    },
    [PLAY_MODE_KEYS.TEAM_2V2]: {
        key: PLAY_MODE_KEYS.TEAM_2V2,
        title: 'Командный бой 2 VS 2',
        subtitle: 'Работайте в паре, комбинируйте атаки и перехватывайте темп у другой команды.',
        icon: 'fas fa-users',
        online: '876 игроков онлайн',
        roomSupported: false,
        heroLabel: 'Режим 2 VS 2',
        cardMeta: {
            ranked: ['Командный рейтинг', 'Подбор по MMR'],
            casual: ['Свободная игра', 'Тренировка связок'],
            room: ['Будет позже', 'Для дружественных матчей'],
        },
    },
    [PLAY_MODE_KEYS.SQUAD_5V5]: {
        key: PLAY_MODE_KEYS.SQUAD_5V5,
        title: 'Арена 5 VS 5',
        subtitle: 'Большой командный формат, где важны роли, тактика и согласованные атаки.',
        icon: 'fas fa-gamepad',
        online: '642 игрока онлайн',
        roomSupported: false,
        heroLabel: 'Режим 5 VS 5',
        cardMeta: {
            ranked: ['Сезонные дивизионы', 'Крупные матчи'],
            casual: ['Нерейтинговые битвы', 'Отработка ролей'],
            room: ['Будет позже', 'Для кастомных боёв'],
        },
    },
    [PLAY_MODE_KEYS.ROYALE]: {
        key: PLAY_MODE_KEYS.ROYALE,
        title: 'Tetris Royale',
        subtitle: 'Выживайте дольше остальных и прорывайтесь к финальной дуэли за первое место.',
        icon: 'fas fa-crown',
        online: '1,908 игроков онлайн',
        roomSupported: false,
        heroLabel: 'Режим Royale',
        cardMeta: {
            ranked: ['Турнирный формат', '20 игроков'],
            casual: ['Свободный вход', 'Быстрые сессии'],
            room: ['Будет позже', 'Для приватных лобби'],
        },
    },
}

export const playOptionCards = [
    {
        key: MATCH_PLAY_OPTIONS.RANKED,
        title: 'Рейтинговый матч',
        icon: 'fas fa-trophy',
        emoji: '🏆',
        description: 'Игра на рейтинг. Побеждайте, поднимайтесь в таблице лидеров и получайте награды.',
    },
    {
        key: MATCH_PLAY_OPTIONS.CASUAL,
        title: 'Обычная игра',
        icon: 'fas fa-gamepad',
        emoji: '🎮',
        description: 'Классический бой без давления рейтинга. Тренируйтесь и играйте в своём темпе.',
    },
    {
        key: MATCH_PLAY_OPTIONS.ROOM,
        title: 'Комната с друзьями',
        icon: 'fas fa-door-open',
        emoji: '🚪',
        description: 'Создайте приватную комнату, поделитесь ID и играйте по своим настройкам.',
    },
]

export const getModeSelectionConfig = (modeKey) => {
    return modeSelectionCatalog[modeKey] || modeSelectionCatalog[PLAY_MODE_KEYS.DUEL_1V1]
}
