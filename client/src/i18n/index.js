import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import en from './locales/en.json'
import ru from './locales/ru.json'

export const DEFAULT_LANGUAGE = 'ru'
export const SUPPORTED_LANGUAGES = ['ru', 'en']

export const getLanguageFromPathname = (pathname = '') => {
    const [, maybeLanguage] = pathname.split('/')

    return SUPPORTED_LANGUAGES.includes(maybeLanguage) ? maybeLanguage : DEFAULT_LANGUAGE
}

i18n
    .use(initReactI18next)
    .init({
        resources: {
            ru: { translation: ru },
            en: { translation: en },
        },
        lng: getLanguageFromPathname(typeof window !== 'undefined' ? window.location.pathname : ''),
        fallbackLng: DEFAULT_LANGUAGE,
        supportedLngs: SUPPORTED_LANGUAGES,
        interpolation: {
            escapeValue: false,
        },
    })

export default i18n
