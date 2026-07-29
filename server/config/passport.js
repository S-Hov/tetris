import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import DiscordPkg from 'passport-discord'
import SteamPkg from 'passport-steam'
import YandexPkg from 'passport-yandex'
import VKPkg from 'passport-vkontakte'
import GitHubPkg from 'passport-github2'
import {
    getOAuthCallbackUrl,
    getServerUrl,
    isOAuthProviderEnabled,
} from '../src/modules/identity/index.js'

const { Strategy: DiscordStrategy } = DiscordPkg
const { Strategy: SteamStrategy } = SteamPkg
const { Strategy: YandexStrategy } = YandexPkg
const { Strategy: VKStrategy } = VKPkg
const { Strategy: GitHubStrategy } = GitHubPkg

const firstValue = (...values) => {
    return values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim() || null
}

const firstEmail = (profile) => {
    return firstValue(
        profile?.emails?.[0]?.value,
        profile?._json?.email,
        profile?._json?.default_email
    )
}

const firstPhoto = (profile) => {
    return firstValue(
        profile?.photos?.[0]?.value,
        profile?._json?.avatar,
        profile?._json?.avatar_url,
        profile?._json?.photo,
        profile?._json?.photo_200,
        profile?._json?.photo_max_orig
    )
}

const displayName = (profile, fallback) => {
    return firstValue(
        profile?.displayName,
        profile?.username,
        profile?._json?.name,
        profile?._json?.login,
        profile?._json?.screen_name,
        profile?._json?.first_name && profile?._json?.last_name
            ? `${profile._json.first_name} ${profile._json.last_name}`
            : null,
        fallback
    )
}

const getVerifiedGitHubEmail = (profile) => {
    if (!Array.isArray(profile?.emails)) {
        return null
    }

    return profile.emails.find((email) => email.verified && email.primary)
        || profile.emails.find((email) => email.verified)
        || null
}

const fetchSteamProfile = async (steamId) => {
    if (typeof fetch !== 'function') {
        return null
    }

    const url = new URL('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/')
    url.searchParams.set('key', process.env.STEAM_API_KEY)
    url.searchParams.set('steamids', steamId)

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    try {
        const response = await fetch(url, {
            signal: controller.signal,
        })

        if (!response.ok) {
            return null
        }

        const payload = await response.json()
        const player = payload?.response?.players?.[0]

        if (!player) {
            return null
        }

        return {
            id: player.steamid,
            displayName: player.personaname,
            photos: [
                { value: player.avatarfull },
                { value: player.avatarmedium },
                { value: player.avatar },
            ].filter((photo) => photo.value),
        }
    } catch {
        return null
    } finally {
        clearTimeout(timeout)
    }
}

const buildOAuthProfile = ({
    provider,
    profile,
    accessToken = null,
    refreshToken = null,
    email = null,
    emailVerified = false,
    avatar = null,
}) => ({
    provider,
    providerAccountId: String(profile.id),
    email: email || firstEmail(profile),
    emailVerified,
    nickname: displayName(profile, `${provider}_${profile.id}`),
    avatar: avatar || firstPhoto(profile),
    accessToken,
    refreshToken,
})

export const configurePassport = () => {
    if (isOAuthProviderEnabled('google')) {
        passport.use('google', new GoogleStrategy({
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: getOAuthCallbackUrl('google'),
        }, (accessToken, refreshToken, profile, done) => {
            done(null, buildOAuthProfile({
                provider: 'google',
                profile,
                accessToken,
                refreshToken,
                emailVerified: Boolean(profile?._json?.email_verified),
            }))
        }))
    }

    if (isOAuthProviderEnabled('discord')) {
        passport.use('discord', new DiscordStrategy({
            clientID: process.env.DISCORD_CLIENT_ID,
            clientSecret: process.env.DISCORD_CLIENT_SECRET,
            callbackURL: getOAuthCallbackUrl('discord'),
            scope: ['identify', 'email'],
        }, (accessToken, refreshToken, profile, done) => {
            const avatar = profile?.avatar && profile?.id
                ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.png`
                : null

            done(null, buildOAuthProfile({
                provider: 'discord',
                profile,
                accessToken,
                refreshToken,
                avatar,
                emailVerified: Boolean(profile?.verified || profile?._json?.verified),
            }))
        }))
    }

    if (isOAuthProviderEnabled('steam')) {
        passport.use('steam', new SteamStrategy({
            returnURL: getOAuthCallbackUrl('steam'),
            realm: `${getServerUrl()}/`,
            apiKey: process.env.STEAM_API_KEY,
            profile: false,
        }, (identifier, profile, done) => {
            const steamId = String(identifier || '').match(/\/id\/(\d+)$/)?.[1] || String(identifier || '')

            fetchSteamProfile(steamId)
                .then((steamProfile) => {
                    done(null, buildOAuthProfile({
                        provider: 'steam',
                        profile: {
                            ...profile,
                            ...steamProfile,
                            id: steamId,
                            displayName: steamProfile?.displayName || `Steam_${String(steamId).slice(-8)}`,
                        },
                        emailVerified: false,
                    }))
                })
                .catch(done)
        }))
    }

    if (isOAuthProviderEnabled('yandex')) {
        passport.use('yandex', new YandexStrategy({
            clientID: process.env.YANDEX_CLIENT_ID,
            clientSecret: process.env.YANDEX_CLIENT_SECRET,
            callbackURL: getOAuthCallbackUrl('yandex'),
        }, (accessToken, refreshToken, profile, done) => {
            done(null, buildOAuthProfile({
                provider: 'yandex',
                profile,
                accessToken,
                refreshToken,
                emailVerified: Boolean(profile?._json?.default_email),
            }))
        }))
    }

    if (isOAuthProviderEnabled('vk')) {
        passport.use('vk', new VKStrategy({
            clientID: process.env.VK_CLIENT_ID,
            clientSecret: process.env.VK_CLIENT_SECRET,
            callbackURL: getOAuthCallbackUrl('vk'),
            profileFields: ['photo_200'],
            apiVersion: '5.131',
            lang: 'ru',
        }, (accessToken, refreshToken, params, profile, done) => {
            done(null, buildOAuthProfile({
                provider: 'vk',
                profile,
                accessToken,
                refreshToken,
                email: params?.email || firstEmail(profile),
                emailVerified: false,
            }))
        }))
    }

    if (isOAuthProviderEnabled('github')) {
        passport.use('github', new GitHubStrategy({
            clientID: process.env.GITHUB_CLIENT_ID,
            clientSecret: process.env.GITHUB_CLIENT_SECRET,
            callbackURL: getOAuthCallbackUrl('github'),
            allRawEmails: true,
        }, (accessToken, refreshToken, profile, done) => {
            const verifiedEmail = getVerifiedGitHubEmail(profile)

            done(null, buildOAuthProfile({
                provider: 'github',
                profile,
                accessToken,
                refreshToken,
                email: verifiedEmail?.value || null,
                emailVerified: Boolean(verifiedEmail),
            }))
        }))
    }

    return passport
}

export default passport
