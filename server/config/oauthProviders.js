export const OAUTH_PROVIDERS = ['google', 'discord', 'steam', 'yandex', 'vk', 'github']

export const OAUTH_PROVIDER_LABELS = {
    google: 'Google',
    discord: 'Discord',
    steam: 'Steam',
    yandex: 'Yandex',
    vk: 'VK',
    github: 'GitHub',
}

const PROVIDER_ENV = {
    google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    discord: ['DISCORD_CLIENT_ID', 'DISCORD_CLIENT_SECRET'],
    steam: ['STEAM_API_KEY'],
    yandex: ['YANDEX_CLIENT_ID', 'YANDEX_CLIENT_SECRET'],
    vk: ['VK_CLIENT_ID', 'VK_CLIENT_SECRET'],
    github: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
}

export const isSupportedOAuthProvider = (provider) => {
    return OAUTH_PROVIDERS.includes(provider)
}

export const getServerUrl = () => {
    return (process.env.SERVER_URL || `http://localhost:${process.env.PORT || 8880}`).replace(/\/+$/, '')
}

export const getClientUrl = () => {
    return (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '')
}

export const getOAuthCallbackUrl = (provider) => {
    if (provider === 'steam' && process.env.STEAM_RETURN_URL) {
        return process.env.STEAM_RETURN_URL
    }

    return `${getServerUrl()}/api/authentication/${provider}/callback`
}

export const isOAuthProviderEnabled = (provider) => {
    const requiredEnv = PROVIDER_ENV[provider]

    if (!requiredEnv) {
        return false
    }

    return requiredEnv.every((key) => Boolean(process.env[key]))
}

const getRedirectWhitelist = () => {
    const explicitWhitelist = (process.env.OAUTH_REDIRECT_WHITELIST || '')
        .split(',')
        .map((origin) => origin.trim().replace(/\/+$/, ''))
        .filter(Boolean)

    return Array.from(new Set([
        getClientUrl(),
        ...explicitWhitelist,
    ]))
}

export const resolveClientRedirectUrl = (returnTo = null, fallbackPath = '/profile') => {
    const clientUrl = getClientUrl()
    const whitelist = getRedirectWhitelist()
    const fallbackUrl = new URL(fallbackPath, `${clientUrl}/`).toString()

    if (!returnTo) {
        return fallbackUrl
    }

    try {
        const candidate = returnTo.startsWith('/')
            ? new URL(returnTo, `${clientUrl}/`)
            : new URL(returnTo)
        const candidateOrigin = candidate.origin.replace(/\/+$/, '')

        if (whitelist.includes(candidateOrigin)) {
            return candidate.toString()
        }
    } catch {
        return fallbackUrl
    }

    return fallbackUrl
}
