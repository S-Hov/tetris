export const formatDateTime = (value, lang = 'ru', t) => {
    if (!value) {
        return t?.('supportRequests.format.dateFallback') || 'Date is not set'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return t?.('supportRequests.format.dateFallback') || 'Date is not set'
    }

    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

export const formatCategory = (category, t) => {
    return t?.(`supportRequests.format.categories.${category}`, { defaultValue: '' })
        || t?.('supportRequests.format.categories.other')
        || 'Other'
}

export const formatChannel = (channel, t) => {
    if (channel === 'telegram') return 'Telegram'
    if (channel === 'email') return t?.('supportRequests.format.channels.email') || 'Email'

    return channel || t?.('supportRequests.format.channels.fallback') || 'Channel is not set'
}

export const formatStatus = (status, t) => {
    return t?.(`supportRequests.format.statuses.${status}`, { defaultValue: '' })
        || status
        || t?.('supportRequests.format.statuses.new')
        || 'New'
}
