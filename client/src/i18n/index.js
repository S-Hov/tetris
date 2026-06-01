import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from './languages'
import aboutEn from '../pages/About/i18n/en.json'
import aboutRu from '../pages/About/i18n/ru.json'
import homeEn from '../pages/Home/i18n/en.json'
import homeRu from '../pages/Home/i18n/ru.json'
import profileEn from '../pages/Profile/i18n/en.json'
import profileRu from '../pages/Profile/i18n/ru.json'
import ratingEn from '../pages/Rating/i18n/en.json'
import ratingRu from '../pages/Rating/i18n/ru.json'
import supportEn from '../pages/Support/i18n/en.json'
import supportRu from '../pages/Support/i18n/ru.json'

export { DEFAULT_LANGUAGE, LANGUAGES, SUPPORTED_LANGUAGES } from './languages'

export const getLanguageFromPathname = (pathname = '') => {
    const [, maybeLanguage] = pathname.split('/')

    return SUPPORTED_LANGUAGES.includes(maybeLanguage) ? maybeLanguage : DEFAULT_LANGUAGE
}

i18n
    .use(initReactI18next)
    .init({
        resources: {
            ru: { translation: { ...homeRu, ...profileRu, ...aboutRu, ...ratingRu, ...supportRu } },
            en: { translation: { ...homeEn, ...profileEn, ...aboutEn, ...ratingEn, ...supportEn } },
        },
        lng: getLanguageFromPathname(typeof window !== 'undefined' ? window.location.pathname : ''),
        fallbackLng: DEFAULT_LANGUAGE,
        supportedLngs: SUPPORTED_LANGUAGES,
        interpolation: {
            escapeValue: false,
        },
    })

export default i18n
