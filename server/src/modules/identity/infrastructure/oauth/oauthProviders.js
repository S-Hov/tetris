export const OAUTH_PROVIDERS = Object.freeze([
    'google',
    'steam',
    'yandex',
    'github',
])

export const OAUTH_PROVIDER_LABELS = Object.freeze({
    google: 'Google',
    discord: 'Discord',
    steam: 'Steam',
    yandex: 'Yandex',
    vk: 'VK',
    github: 'GitHub',
})

const PROVIDER_ENV = Object.freeze({
    google: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    steam: ['STEAM_API_KEY'],
    yandex: ['YANDEX_CLIENT_ID', 'YANDEX_CLIENT_SECRET'],
    github: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
})

export const createOAuthProviderConfig = (env = process.env) => {
    const getServerUrl = () => (
        env.SERVER_URL || `http://localhost:${env.PORT || 8880}`
    ).replace(/\/+$/, '')
    const getClientUrl = () => (
        env.CLIENT_URL || 'http://localhost:5173'
    ).replace(/\/+$/, '')
    const isSupportedOAuthProvider = (provider) => OAUTH_PROVIDERS.includes(provider)
    const isOAuthProviderEnabled = (provider) => (
        PROVIDER_ENV[provider]?.every((key) => Boolean(env[key])) || false
    )
    const getOAuthCallbackUrl = (provider) => (
        provider === 'steam' && env.STEAM_RETURN_URL
            ? env.STEAM_RETURN_URL
            : `${getServerUrl()}/api/authentication/${provider}/callback`
    )
    const getRedirectWhitelist = () => {
        const explicit = (env.OAUTH_REDIRECT_WHITELIST || '')
            .split(',')
            .map((origin) => origin.trim().replace(/\/+$/, ''))
            .filter(Boolean)

        return [...new Set([getClientUrl(), ...explicit])]
    }
    const resolveClientRedirectUrl = (returnTo = null, fallbackPath = '/profile') => {
        const clientUrl = getClientUrl()
        const fallbackUrl = new URL(fallbackPath, `${clientUrl}/`).toString()

        if (!returnTo) {
            return fallbackUrl
        }

        try {
            const candidate = returnTo.startsWith('/')
                ? new URL(returnTo, `${clientUrl}/`)
                : new URL(returnTo)

            if (getRedirectWhitelist().includes(candidate.origin.replace(/\/+$/, ''))) {
                return candidate.toString()
            }
        } catch {
            return fallbackUrl
        }

        return fallbackUrl
    }

    return Object.freeze({
        getClientUrl,
        getOAuthCallbackUrl,
        getServerUrl,
        isOAuthProviderEnabled,
        isSupportedOAuthProvider,
        resolveClientRedirectUrl,
    })
}

const defaultConfig = createOAuthProviderConfig()

export const getClientUrl = defaultConfig.getClientUrl
export const getOAuthCallbackUrl = defaultConfig.getOAuthCallbackUrl
export const getServerUrl = defaultConfig.getServerUrl
export const isOAuthProviderEnabled = defaultConfig.isOAuthProviderEnabled
export const isSupportedOAuthProvider = defaultConfig.isSupportedOAuthProvider
export const resolveClientRedirectUrl = defaultConfig.resolveClientRedirectUrl
