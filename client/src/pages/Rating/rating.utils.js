import { DEFAULT_LANGUAGE } from '@/i18n'

export const formatNumber = (value, lang = DEFAULT_LANGUAGE) => new Intl.NumberFormat(lang === 'en' ? 'en-US' : 'ru-RU').format(Number(value) || 0)

export const getAssetUrl = (value) => {
    if (!value) return ''
    if (/^https?:\/\//i.test(value)) return value

    const baseUrl = import.meta.env.VITE_API_URL || (
        typeof window !== 'undefined' && window.location.hostname
            ? `http://${window.location.hostname}:8880`
            : 'http://127.0.0.1:8880'
    )

    return `${baseUrl}${value}`
}

export const getAvatarFallback = (username = '') => username.trim().slice(0, 1).toUpperCase() || '?'

export const getRankIcon = (rank) => {
    if (rank === 1) return '#1'
    if (rank === 2) return '2'
    if (rank === 3) return '3'

    return rank
}

export const getSortLabel = (sort, sortOptions, t) => {
    const option = sortOptions.find((item) => item.key === sort)

    return `${t('rating.board.sortPrefix')}: ${option?.label || t('rating.sort.rating')}`
}
