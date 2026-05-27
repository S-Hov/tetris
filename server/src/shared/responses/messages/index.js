import ru from './ru.js'
import en from './en.js'

export const DEFAULT_LANG = 'ru'
export const SUPPORTED_LANGS = new Set(['ru', 'en'])

const dictionaries = {
    ru,
    en,
}

const normalizeLang = (value) => {
    const lang = String(value || '')
        .trim()
        .toLowerCase()
        .split(',')[0]
        .split(';')[0]
        .split('-')[0]

    return SUPPORTED_LANGS.has(lang) ? lang : DEFAULT_LANG
}

export const getLang = (req) => {
    const headerLang = req?.get?.('x-language') || req?.headers?.['x-language']
    const acceptLang = req?.get?.('accept-language') || req?.headers?.['accept-language']

    return normalizeLang(headerLang || acceptLang)
}

export const translate = (code, lang = DEFAULT_LANG) => {
    const normalizedLang = normalizeLang(lang)

    return dictionaries[normalizedLang]?.[code] || dictionaries[DEFAULT_LANG]?.[code] || code
}

export default dictionaries
