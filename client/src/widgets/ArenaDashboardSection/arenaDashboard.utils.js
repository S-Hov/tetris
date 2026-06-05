export const formatNumber = (value, language) => new Intl.NumberFormat(language === 'en' ? 'en-US' : 'ru-RU').format(Number(value) || 0)

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
