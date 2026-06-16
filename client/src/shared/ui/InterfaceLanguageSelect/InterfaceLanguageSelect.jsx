import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import CustomSelect from '@/shared/ui/CustomSelect'
import { DEFAULT_LANGUAGE, getLocalizedPath, LANGUAGES, SUPPORTED_LANGUAGES } from '@/i18n'
import './InterfaceLanguageSelect.css'

const LANGUAGE_STORAGE_KEY = 'interfaceLanguage'

const InterfaceLanguageSelect = ({ className = '', menuPlacement = 'bottom' }) => {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const { i18n } = useTranslation()
    const pathLanguage = getPathLanguage(pathname)
    const currentLanguage = pathLanguage || getStoredLanguage() || getI18nLanguage(i18n.language)

    const handleLanguageChange = (nextLanguage) => {
        const language = SUPPORTED_LANGUAGES.includes(nextLanguage) ? nextLanguage : DEFAULT_LANGUAGE

        if (typeof window !== 'undefined') {
            window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
        }

        if (i18n.language !== language) {
            i18n.changeLanguage(language)
        }

        const nextPath = getLocalizedPath(pathname, language)

        if (nextPath !== pathname) {
            navigate(nextPath)
        }
    }

    return (
        <CustomSelect
            className={`interface-language-select ${className}`}
            value={currentLanguage}
            options={LANGUAGES}
            menuPlacement={menuPlacement}
            onChange={handleLanguageChange}
        />
    )
}

const getPathLanguage = (pathname = '') => {
    const [, maybeLanguage] = pathname.split('/')

    return SUPPORTED_LANGUAGES.includes(maybeLanguage) ? maybeLanguage : ''
}

const getStoredLanguage = () => {
    if (typeof window === 'undefined') {
        return ''
    }

    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY)

    return SUPPORTED_LANGUAGES.includes(storedLanguage) ? storedLanguage : ''
}

const getI18nLanguage = (language = '') => {
    const normalizedLanguage = language.split('-')[0]

    return SUPPORTED_LANGUAGES.includes(normalizedLanguage) ? normalizedLanguage : DEFAULT_LANGUAGE
}

export default InterfaceLanguageSelect
