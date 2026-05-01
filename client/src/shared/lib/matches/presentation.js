export const getMatchModeLabel = (mode) => {
    switch (mode) {
        case 'solo':
            return 'Solo'
        case '1v1':
            return '1 VS 1'
        case '2v2':
            return '2 VS 2'
        case '5v5':
            return '5 VS 5'
        case 'royale':
            return 'Royale'
        default:
            return mode || 'Матч'
    }
}

export const getMatchModeIcon = (mode) => {
    switch (mode) {
        case 'solo':
            return 'fas fa-user'
        case '1v1':
            return 'fas fa-fist-raised'
        case '2v2':
            return 'fas fa-users'
        case '5v5':
            return 'fas fa-gamepad'
        case 'royale':
            return 'fas fa-crown'
        default:
            return 'fas fa-cubes'
    }
}

export const formatMatchDate = (value) => {
    if (!value) {
        return 'Нет данных'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return 'Нет данных'
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

export const formatFullDate = (value) => {
    if (!value) {
        return 'Нет данных'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return 'Нет данных'
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

export const formatDuration = (seconds) => {
    const normalizedSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
    const minutes = Math.floor(normalizedSeconds / 60)
    const restSeconds = normalizedSeconds % 60

    if (minutes === 0) {
        return `${restSeconds} сек`
    }

    if (restSeconds === 0) {
        return `${minutes} мин`
    }

    return `${minutes} мин ${restSeconds} сек`
}

export const formatMatchResultLabel = (result) => {
    return result === 'win' ? 'Победа' : 'Поражение'
}

export const getMatchResultClass = (result) => {
    return result === 'win' ? 'win' : 'loss'
}

export const describeTimelineEvent = (event) => {
    const source = event.sourcePlayer?.nickname
    const target = event.targetPlayer?.nickname
    const payload = event.payload && typeof event.payload === 'object' ? event.payload : null
    const effectTypeLabel = formatEffectType(payload?.effectType)

    if (payload?.message) {
        return effectTypeLabel
            ? `${payload.message} • Эффект: ${effectTypeLabel}`
            : payload.message
    }

    switch (event.eventType) {
        case 'attack':
            return source && target
                ? `${source} атакует ${target}`
                : 'Игровая атака'
        case 'ability_used':
            return source
                ? `${source} использует способность${effectTypeLabel ? ` • Эффект: ${effectTypeLabel}` : ''}`
                : `Использована способность${effectTypeLabel ? ` • Эффект: ${effectTypeLabel}` : ''}`
        case 'garbage_sent':
            return source && target
                ? `${source} отправляет мусорные линии игроку ${target}`
                : 'Отправлены мусорные линии'
        case 'player_joined':
            return source
                ? `${source} присоединился к матчу`
                : 'Игрок присоединился к матчу'
        case 'player_left':
            return source
                ? `${source} покинул матч`
                : 'Игрок покинул матч'
        default:
            return effectTypeLabel
                || payload?.effect
                || payload?.description
                || payload?.name
                || event.eventType
                || 'Событие матча'
    }
}

export const getTimelineIcon = (eventType) => {
    switch (eventType) {
        case 'attack':
        case 'garbage_sent':
            return 'fas fa-bolt'
        case 'ability_used':
            return 'fas fa-wand-magic-sparkles'
        case 'player_joined':
            return 'fas fa-sign-in-alt'
        case 'player_left':
            return 'fas fa-sign-out-alt'
        default:
            return 'fas fa-play'
    }
}

export const getTeamAccentClass = (teamNumber) => {
    return teamNumber === 1 ? 'team-a' : 'team-b'
}

const formatEffectType = (effectType) => {
    if (!effectType) {
        return ''
    }

    switch (effectType) {
        case 'speed_x2_for_4s':
            return 'Ускорение x2 на 4 сек'
        case 'darkness':
            return 'Затемнение поля'
        case 'garbage_rain':
            return 'Мусорный дождь'
        case 'controls_swap':
            return 'Смена управления'
        case 'fog_piece':
            return 'Скрытие следующей фигуры'
        case 'gravity_lock':
            return 'Тяжелая гравитация'
        case 'screen_shake':
            return 'Тряска экрана'
        case 'random_rotation':
            return 'Случайный поворот'
        case 'sticky_walls':
            return 'Липкие стены'
        case 'delay_input':
            return 'Задержка ввода'
        case 'random_shift':
            return 'Сдвиг поля'
        case 'invisible_cells':
            return 'Невидимые клетки'
        default:
            return String(effectType)
                .replaceAll('_', ' ')
                .trim()
    }
}
