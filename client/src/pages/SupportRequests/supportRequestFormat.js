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
    const categoryKey = normalizeFormatKey(category) || 'other'

    return t?.(`supportRequests.format.categories.${categoryKey}`, { defaultValue: '' })
        || t?.('supportRequests.format.categories.other')
        || 'Other'
}

export const formatChannel = (channel, t) => {
    const channelKey = normalizeFormatKey(channel)

    if (channelKey === 'telegram') return t?.('supportRequests.format.channels.telegram') || 'Telegram'
    if (channelKey === 'email') return t?.('supportRequests.format.channels.email') || 'Email'

    return channel || t?.('supportRequests.format.channels.fallback') || 'Channel is not set'
}

export const formatStatus = (status, t) => {
    const statusKey = normalizeFormatKey(status) || 'new'

    return t?.(`supportRequests.format.statuses.${statusKey}`, { defaultValue: '' })
        || status
        || t?.('supportRequests.format.statuses.new')
        || 'New'
}

const normalizeFormatKey = (value = '') => String(value || '')
    .trim()
    .toLowerCase()
    .replaceAll('-', '_')
    .replace(/\s+/g, '_')
