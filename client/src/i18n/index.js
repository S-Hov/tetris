import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './languages'
import authEn from '../features/AuthForm/i18n/en.json'
import authRu from '../features/AuthForm/i18n/ru.json'
import emailVerificationEn from '../features/EmailVerification/i18n/en.json'
import emailVerificationRu from '../features/EmailVerification/i18n/ru.json'
import aboutEn from '../pages/About/i18n/en.json'
import aboutRu from '../pages/About/i18n/ru.json'
import effectsEn from '../pages/Effects/i18n/en.json'
import effectsRu from '../pages/Effects/i18n/ru.json'
import homeEn from '../pages/Home/i18n/en.json'
import homeRu from '../pages/Home/i18n/ru.json'
import gameControlsEn from '../pages/GameSettings/i18n/en.json'
import gameControlsRu from '../pages/GameSettings/i18n/ru.json'
import accountSettingsEn from '../pages/AccountSettings/i18n/en.json'
import accountSettingsRu from '../pages/AccountSettings/i18n/ru.json'
import friendsEn from '../pages/Friends/i18n/en.json'
import friendsRu from '../pages/Friends/i18n/ru.json'
import matchesEn from '../pages/Matches/i18n/en.json'
import matchesRu from '../pages/Matches/i18n/ru.json'
import lobbyEn from '../pages/Lobby/i18n/en.json'
import lobbyRu from '../pages/Lobby/i18n/ru.json'
import legalDocsEn from '../pages/LegalDocs/i18n/en.json'
import legalDocsRu from '../pages/LegalDocs/i18n/ru.json'
import modeSelectEn from '../pages/ModeSelect/i18n/en.json'
import modeSelectRu from '../pages/ModeSelect/i18n/ru.json'
import profileEn from '../pages/Profile/i18n/en.json'
import profileRu from '../pages/Profile/i18n/ru.json'
import inventoryEn from '../pages/Inventory/i18n/en.json'
import inventoryRu from '../pages/Inventory/i18n/ru.json'
import ratingEn from '../pages/Rating/i18n/en.json'
import ratingRu from '../pages/Rating/i18n/ru.json'
import supportEn from '../pages/Support/i18n/en.json'
import supportRu from '../pages/Support/i18n/ru.json'
import supportRequestsEn from '../pages/SupportRequests/i18n/en.json'
import supportRequestsRu from '../pages/SupportRequests/i18n/ru.json'
import teamQueueEn from '../pages/TeamQueue/i18n/en.json'
import teamQueueRu from '../pages/TeamQueue/i18n/ru.json'
import siteFooterEn from '../shared/ui/SiteFooter/i18n/en.json'
import siteFooterRu from '../shared/ui/SiteFooter/i18n/ru.json'
import cookieConsentBannerEn from '../widgets/CookieConsentBanner/i18n/en.json'
import cookieConsentBannerRu from '../widgets/CookieConsentBanner/i18n/ru.json'
import simpleHeaderEn from '../widgets/Header/SimpleHeader/i18n/en.json'
import simpleHeaderRu from '../widgets/Header/SimpleHeader/i18n/ru.json'

export { DEFAULT_LANGUAGE, LANGUAGES, SUPPORTED_LANGUAGES } from './languages'

export const getLanguageFromPathname = (pathname = '') => {
    const [, maybeLanguage] = pathname.split('/')

    if (SUPPORTED_LANGUAGES.includes(maybeLanguage)) {
        return maybeLanguage
    }

    if (typeof window !== 'undefined') {
        const storedLanguage = window.localStorage.getItem('interfaceLanguage')

        if (SUPPORTED_LANGUAGES.includes(storedLanguage)) {
            return storedLanguage
        }
    }

    return DEFAULT_LANGUAGE
}

export const stripLanguageFromPathname = (pathname = '') => {
    const [pathPart = '', suffix = ''] = pathname.split(/([?#].*)/, 2)
    const parts = pathPart.split('/')
    const maybeLanguage = parts[1]

    if (!SUPPORTED_LANGUAGES.includes(maybeLanguage)) {
        return pathname || '/'
    }

    const pathWithoutLanguage = `/${parts.slice(2).join('/')}`.replace(/\/+$/, '') || '/'
    return `${pathWithoutLanguage}${suffix}`
}

export const getLocalizedPath = (
    path,
    language = getLanguageFromPathname(typeof window !== 'undefined' ? window.location.pathname : '')
) => {
    if (!path || path === '/') {
        return `/${language}`
    }

    if (/^(https?:)?\/\//.test(path) || path.startsWith('#')) {
        return path
    }

    const [pathPart = '/', suffix = ''] = path.split(/([?#].*)/, 2)
    const normalizedPath = pathPart.startsWith('/') ? pathPart : `/${pathPart}`
    const pathWithoutLanguage = stripLanguageFromPathname(normalizedPath)

    if (pathWithoutLanguage === '/') {
        return `/${language}${suffix}`
    }

    return `/${language}${pathWithoutLanguage}${suffix}`
}

export const getLocalizedGamePath = getLocalizedPath

i18n
    .use(initReactI18next)
    .init({
        resources: {
            ru: { translation: { ...homeRu, ...profileRu, ...inventoryRu, ...aboutRu, ...effectsRu, ...ratingRu, ...supportRu, ...gameControlsRu, ...accountSettingsRu, ...friendsRu, ...matchesRu, ...lobbyRu, ...legalDocsRu, ...modeSelectRu, ...supportRequestsRu, ...teamQueueRu, ...authRu, ...emailVerificationRu, ...siteFooterRu, ...cookieConsentBannerRu, ...simpleHeaderRu } },
            en: { translation: { ...homeEn, ...profileEn, ...inventoryEn, ...aboutEn, ...effectsEn, ...ratingEn, ...supportEn, ...gameControlsEn, ...accountSettingsEn, ...friendsEn, ...matchesEn, ...lobbyEn, ...legalDocsEn, ...modeSelectEn, ...supportRequestsEn, ...teamQueueEn, ...authEn, ...emailVerificationEn, ...siteFooterEn, ...cookieConsentBannerEn, ...simpleHeaderEn } },
        },
        lng: getLanguageFromPathname(typeof window !== 'undefined' ? window.location.pathname : ''),
        fallbackLng: DEFAULT_LANGUAGE,
        supportedLngs: SUPPORTED_LANGUAGES,
        interpolation: {
            escapeValue: false,
        },
    })

export default i18n
