import { simpleHeaderConfig } from './simpleHeader.data'
import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import './SimpleHeader.css'
import HeaderBrand from '@/shared/ui/Header/HeaderBrand'
import GlowEffect from '@/shared/ui/GlowEffect'
import ServerPingIndicator from '@/shared/ui/ServerPingIndicator'
// import InterfaceLanguageSelect from '@/shared/ui/InterfaceLanguageSelect'
import { DEFAULT_LANGUAGE, getLocalizedPath, stripLanguageFromPathname, SUPPORTED_LANGUAGES } from '@/i18n'


export default function SimpleHeader() {
    const location = useLocation()
    const { t, i18n } = useTranslation()
    const currentLanguage = getPathLanguage(location.pathname) || normalizeLanguage(i18n.language)
    const normalizedPathname = stripLanguageFromPathname(location.pathname)
    const activeConfig = simpleHeaderConfig.find((config) => config.match(normalizedPathname))
    const showSocketPing = isGameSocketPingPath(location.pathname)

    const currentConfig = activeConfig || {
        backTo: '/',
        backLabelKey: 'simpleHeader.back.home',
    }
    const rawPrimaryTo = typeof currentConfig.backTo === 'function'
        ? currentConfig.backTo(normalizedPathname)
        : currentConfig.backTo
    const rawSecondaryTo = typeof currentConfig.secondaryTo === 'function'
        ? currentConfig.secondaryTo(normalizedPathname)
        : currentConfig.secondaryTo
    const primaryTo = getLocalizedHeaderPath(rawPrimaryTo, currentLanguage)
    const secondaryTo = rawSecondaryTo ? getLocalizedHeaderPath(rawSecondaryTo, currentLanguage) : ''

    return (
        <GlowEffect>
            <header className="header simple-header">
                <div className="header-border-glow"></div>

                <div className="header-content simple-header-content">
                    <HeaderBrand description={false} title={false} />
                    <nav className="simple-header-nav">
                        {showSocketPing ? <ServerPingIndicator /> : null}
                        <Link to={primaryTo} className="back-link button">
                            <i className="fas fa-arrow-left"></i> {t(currentConfig.backLabelKey)}
                        </Link>
                        {
                            activeConfig && secondaryTo
                                ? <Link to={secondaryTo} className="back-link button ">
                                    <i className="fas fa-arrow-left"></i> {t(currentConfig.secondaryLabelKey || 'simpleHeader.back.home')}
                                </Link>
                                : null
                        }
                        {/* <InterfaceLanguageSelect className="simple-header-language-select" /> */}
                    </nav>
                </div>

                <div className="glow-line" />
            </header>
        </GlowEffect>
    )
}

const getLocalizedHeaderPath = (path, language = DEFAULT_LANGUAGE) => {
    if (!path || path === '/') {
        return `/${language}`
    }

    return getLocalizedPath(path, language)
}

const normalizeLanguage = (language = '') => {
    const normalized = language.split('-')[0]

    return SUPPORTED_LANGUAGES.includes(normalized) ? normalized : DEFAULT_LANGUAGE
}

const getPathLanguage = (pathname = '') => {
    const [, maybeLanguage] = pathname.split('/')

    return SUPPORTED_LANGUAGES.includes(maybeLanguage) ? maybeLanguage : ''
}

const isGameSocketPingPath = (pathname = '') => {
    const normalizedPathname = stripLanguageFromPathname(pathname)

    return normalizedPathname.startsWith('/game/') || normalizedPathname.startsWith('/match/')
}
