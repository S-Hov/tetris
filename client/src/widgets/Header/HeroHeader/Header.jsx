import { Link, useLocation, useNavigate } from 'react-router-dom'
import './Header.css'
import { modeItems, modeStats, navItems } from './header.data.js'
import HeaderNavContext from '@/shared/context/HeaderNavContext.js'
import HeaderNav from '@/features/HeaderNav'
import HeaderBrand from '@/shared/ui/Header/HeaderBrand'
import GlowEffect from '@/shared/ui/GlowEffect'
import CustomSelect from '@/shared/ui/CustomSelect'
import { DEFAULT_LANGUAGE, LANGUAGES, getLanguageFromPathname } from '@/i18n'
import mobileLogo from '@/widgets/Header/assets/logo.png'
import { useTranslation } from 'react-i18next'

export default function Header() {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const { t } = useTranslation()
    const currentLanguage = getLanguageFromPathname(pathname)
    const homePath = `/${currentLanguage}`
    const localizedNavItems = navItems.map((item) => ({
        ...item,
        label: t(item.labelKey),
        to: getNavItemPath(item, homePath),
    }))
    const activeMode = getActiveItemKey(modeItems, pathname)
    const activePage = activeMode ? null : getActiveItemKey(localizedNavItems, pathname)
    const activeModeItem = modeItems.find((item) => item.key === activeMode) || modeItems[0]
    const mobileModeOptions = modeItems.map((item) => ({
        value: item.to,
        label: item.label,
        icon: item.icon,
    }))
    const handleLanguageChange = (nextLanguage) => {
        if (nextLanguage === currentLanguage) {
            return
        }

        navigate(getLocalizedPath(pathname, nextLanguage || DEFAULT_LANGUAGE))
    }

    const contextValue = {
        activePage,
        activeMode,
        navItems: localizedNavItems,
        modeItems,
        modeStats,
    }

    return (
        <GlowEffect >
            <header className="header hero-header">
                <div className="header-content">
                    <HeaderBrand to={homePath} />
                    <HeaderNavContext.Provider value={contextValue}>
                        <HeaderNav type="nav" />
                        <HeaderNav type="mode" />
                    </HeaderNavContext.Provider>
                    <CustomSelect
                        className="header-language-select"
                        value={currentLanguage}
                        options={LANGUAGES}
                        onChange={handleLanguageChange}
                    />

                    {/* {stats && (
                        <div className="stats-panel">
                            <div className="stat">
                                <i className="fas fa-globe"></i>
                                <span>ONLINE:</span>
                                <span className="stat-value">{stats.online}</span>
                            </div>

                            <div className="stat">
                                <i className="fas fa-trophy"></i>
                                <span>TOP:</span>
                                <span className="stat-value">{stats.rating}</span>
                            </div>

                            <div className="stat">
                                <i className="fas fa-bolt"></i>
                                <span>LOBBIES:</span>
                                <span className="stat-value">{stats.lobbies}</span>
                            </div>
                        </div>
                    )} */}
                </div>

                <div className="glow-line" />
            </header>
            <nav className="mobile-bottom-nav" aria-label={t('header.mobileNavigation')}>
                <Link to={homePath} className="mobile-bottom-nav__brand" aria-label="PVP Tetris">
                    <img src={mobileLogo} alt="" />
                </Link>
                <div className="mobile-bottom-nav__pages">
                    {localizedNavItems.map((item) => (
                        <Link
                            key={item.key}
                            to={item.to}
                            className={`mobile-bottom-nav__link ${activePage === item.key ? 'mobile-bottom-nav__link--active' : ''}`}
                            aria-label={item.label}
                            title={item.label}
                        >
                            <i className={item.icon} aria-hidden="true"></i>
                        </Link>
                    ))}
                </div>
                <CustomSelect
                    className="mobile-mode-select"
                    value={activeModeItem.to}
                    options={mobileModeOptions}
                    menuPlacement="top"
                    onChange={(nextPath) => navigate(nextPath)}
                />
                <CustomSelect
                    className="mobile-language-select"
                    value={currentLanguage}
                    options={LANGUAGES}
                    menuPlacement="top"
                    onChange={handleLanguageChange}
                />
            </nav>
        </GlowEffect>
    )
}

const getLocalizedPath = (pathname, language) => {
    if (!pathname || pathname === '/') {
        return `/${language}`
    }

    const parts = pathname.split('/')
    const pathWithoutLanguage = parts[1] === 'ru' || parts[1] === 'en'
        ? `/${parts.slice(2).join('/')}`.replace(/\/+$/, '') || '/'
        : pathname

    if (parts[1] === 'ru' || parts[1] === 'en') {
        if (pathWithoutLanguage === '/' || pathWithoutLanguage === '') {
            return `/${language}`
        }

        return ['/about', '/profile', '/support'].includes(pathWithoutLanguage)
            ? `/${language}${pathWithoutLanguage}`
            : `/${language}`
    }

    return ['/about', '/profile', '/support'].includes(pathname) ? `/${language}${pathname}` : `/${language}`
}

const getNavItemPath = (item, homePath) => {
    if (item.key === 'home') {
        return homePath
    }

    if (['about', 'profile', 'support'].includes(item.key)) {
        return `${homePath}${item.to}`
    }

    return item.to
}

const getActiveItemKey = (items, pathname) => {
    const normalizedPathname = normalizePath(pathname)
    const sortedItems = [...items].sort((firstItem, secondItem) => secondItem.to.length - firstItem.to.length)
    const activeItem = sortedItems.find((item) => {
        const itemPath = normalizePath(item.to)

        if (itemPath === '/') {
            return normalizedPathname === '/'
        }

        return normalizedPathname === itemPath || normalizedPathname.startsWith(`${itemPath}/`)
    })

    return activeItem?.key || null
}

const normalizePath = (path) => {
    if (!path || path === '/') {
        return '/'
    }

    return path.replace(/\/+$/, '')
}
