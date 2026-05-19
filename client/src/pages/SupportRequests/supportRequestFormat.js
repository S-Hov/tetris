export const formatDateTime = (value) => {
    if (!value) {
        return 'Дата не указана'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return 'Дата не указана'
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

export const formatCategory = (category) => {
    const labels = {
        bug: 'Баг или ошибка',
        idea: 'Идея',
        mode: 'Новый режим',
        balance: 'Баланс',
        other: 'Другое',
    }

    return labels[category] || 'Другое'
}

export const formatChannel = (channel) => {
    if (channel === 'telegram') return 'Telegram'
    if (channel === 'email') return 'Почта'

    return channel || 'Канал не указан'
}

export const formatStatus = (status) => {
    const labels = {
        new: 'Новое',
        triaged: 'Принято',
        in_progress: 'В работе',
        closed: 'Закрыто',
        spam: 'Отклонено',
    }

    return labels[status] || status || 'Новое'
}
