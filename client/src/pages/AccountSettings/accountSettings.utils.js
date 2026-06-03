export const buildAccountProfile = ({ t, user }) => {
    const displayName = user?.username || user?.email?.split('@')[0] || t('accountSettings.common.playerFallback')

    return {
        name: displayName,
        email: user?.email || t('accountSettings.common.emailFallback'),
        avatarUrl: getAssetUrl(user?.avatar_url),
        country: t('accountSettings.common.country'),
        status: user?.status || 'active',
    }
}

export const getAssetUrl = (value) => {
    if (!value) {
        return ''
    }

    if (/^https?:\/\//i.test(value)) {
        return value
    }

    const baseUrl = import.meta.env.VITE_API_URL || (
        typeof window !== 'undefined' && window.location.hostname
            ? `http://${window.location.hostname}:8880`
            : 'http://127.0.0.1:8880'
    )

    return `${baseUrl}${value}`
}

export const isVideoAvatar = (src) => /\.(webm|mp4|mov|ogg|ogv|m4v)(?:[?#]|$)/i.test(src)

export const getProviderIcon = (provider) => {
    const icons = {
        github: 'fab fa-github',
        google: 'fab fa-google',
        discord: 'fab fa-discord',
        steam: 'fab fa-steam',
        vk: 'fab fa-vk',
        yandex: 'fab fa-yandex',
    }

    return icons[provider] || 'fas fa-link'
}

export const formatStatus = (status, t) => {
    if (status === 'active') return t('accountSettings.common.active')
    if (status === 'pending_verification') return t('accountSettings.common.pendingVerification')

    return status || t('accountSettings.common.active')
}

export const formatDateTime = (value, language, t) => {
    if (!value) {
        return t('accountSettings.common.unknownTime')
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return t('accountSettings.common.unknownTime')
    }

    return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}
