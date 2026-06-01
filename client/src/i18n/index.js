import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './languages'
import aboutEn from '../pages/About/i18n/en.json'
import aboutRu from '../pages/About/i18n/ru.json'
import homeEn from '../pages/Home/i18n/en.json'
import homeRu from '../pages/Home/i18n/ru.json'
import gameControlsEn from '../pages/GameSettings/i18n/en.json'
import gameControlsRu from '../pages/GameSettings/i18n/ru.json'
import accountSettingsEn from '../pages/AccountSettings/i18n/en.json'
import accountSettingsRu from '../pages/AccountSettings/i18n/ru.json'
import matchesEn from '../pages/Matches/i18n/en.json'
import matchesRu from '../pages/Matches/i18n/ru.json'
import profileEn from '../pages/Profile/i18n/en.json'
import profileRu from '../pages/Profile/i18n/ru.json'
import ratingEn from '../pages/Rating/i18n/en.json'
import ratingRu from '../pages/Rating/i18n/ru.json'
import supportEn from '../pages/Support/i18n/en.json'
import supportRu from '../pages/Support/i18n/ru.json'
import supportRequestsEn from '../pages/SupportRequests/i18n/en.json'
import supportRequestsRu from '../pages/SupportRequests/i18n/ru.json'

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

i18n
    .use(initReactI18next)
    .init({
        resources: {
            ru: { translation: { ...homeRu, ...profileRu, ...aboutRu, ...ratingRu, ...supportRu, ...gameControlsRu, ...accountSettingsRu, ...matchesRu, ...supportRequestsRu } },
            en: { translation: { ...homeEn, ...profileEn, ...aboutEn, ...ratingEn, ...supportEn, ...gameControlsEn, ...accountSettingsEn, ...matchesEn, ...supportRequestsEn } },
        },
        lng: getLanguageFromPathname(typeof window !== 'undefined' ? window.location.pathname : ''),
        fallbackLng: DEFAULT_LANGUAGE,
        supportedLngs: SUPPORTED_LANGUAGES,
        interpolation: {
            escapeValue: false,
        },
    })

export default i18n
