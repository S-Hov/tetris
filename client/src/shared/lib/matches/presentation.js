export const getMatchModeLabel = (mode, t) => {
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
            return mode || t?.('matches.common.match') || 'Match'
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

export const formatMatchDate = (value, lang = 'ru', t) => {
    if (!value) {
        return t?.('matches.common.noData') || 'No data'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return t?.('matches.common.noData') || 'No data'
    }

    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

export const formatFullDate = (value, lang = 'ru', t) => {
    if (!value) {
        return t?.('matches.common.noData') || 'No data'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return t?.('matches.common.noData') || 'No data'
    }

    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

export const formatDuration = (seconds, t) => {
    const normalizedSeconds = Number.isFinite(seconds) ? Math.max(0, Math.floor(seconds)) : 0
    const minutes = Math.floor(normalizedSeconds / 60)
    const restSeconds = normalizedSeconds % 60

    if (minutes === 0) {
        return t?.('matches.duration.seconds', { count: restSeconds }) || `${restSeconds} sec`
    }

    if (restSeconds === 0) {
        return t?.('matches.duration.minutes', { count: minutes }) || `${minutes} min`
    }

    return t?.('matches.duration.minutesSeconds', { minutes, seconds: restSeconds }) || `${minutes} min ${restSeconds} sec`
}

export const formatMatchResultLabel = (result, t) => {
    return result === 'win'
        ? (t?.('matches.common.win') || 'Win')
        : (t?.('matches.common.loss') || 'Loss')
}

export const getMatchResultClass = (result) => {
    return result === 'win' ? 'win' : 'loss'
}

export const describeTimelineEvent = (event, t) => {
    const source = event.sourcePlayer?.nickname
    const target = event.targetPlayer?.nickname
    const payload = event.payload && typeof event.payload === 'object' ? event.payload : null
    const effectTypeLabel = formatEffectType(payload?.effectType, t)

    if (payload?.message) {
        return effectTypeLabel
            ? `${payload.message} • ${t?.('matches.timeline.effect') || 'Effect'}: ${effectTypeLabel}`
            : payload.message
    }

    switch (event.eventType) {
        case 'attack':
            return source && target
                ? (t?.('matches.timeline.attack', { source, target }) || `${source} attacks ${target}`)
                : (t?.('matches.timeline.attackFallback') || 'Game attack')
        case 'ability_used':
            return source
                ? `${t?.('matches.timeline.abilityUsed', { source }) || `${source} uses an ability`}${effectTypeLabel ? ` • ${t?.('matches.timeline.effect') || 'Effect'}: ${effectTypeLabel}` : ''}`
                : `${t?.('matches.timeline.abilityFallback') || 'Ability used'}${effectTypeLabel ? ` • ${t?.('matches.timeline.effect') || 'Effect'}: ${effectTypeLabel}` : ''}`
        case 'garbage_sent':
            return source && target
                ? (t?.('matches.timeline.garbageSent', { source, target }) || `${source} sends garbage lines to ${target}`)
                : (t?.('matches.timeline.garbageFallback') || 'Garbage lines sent')
        case 'player_joined':
            return source
                ? (t?.('matches.timeline.playerJoined', { source }) || `${source} joined the match`)
                : (t?.('matches.timeline.playerJoinedFallback') || 'Player joined the match')
        case 'player_left':
            return source
                ? (t?.('matches.timeline.playerLeft', { source }) || `${source} left the match`)
                : (t?.('matches.timeline.playerLeftFallback') || 'Player left the match')
        default:
            return effectTypeLabel
                || payload?.effect
                || payload?.description
                || payload?.name
                || event.eventType
                || t?.('matches.timeline.eventFallback')
                || 'Match event'
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

const formatEffectType = (effectType, t) => {
    if (!effectType) {
        return ''
    }

    const translated = t?.(`matches.timeline.effects.${effectType}`, { defaultValue: '' })

    if (translated) {
        return translated
    }

    return String(effectType)
        .replaceAll('_', ' ')
        .trim()
}
