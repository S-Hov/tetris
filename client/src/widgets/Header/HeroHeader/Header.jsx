import { Link, useLocation, useNavigate } from 'react-router-dom'
import './Header.css'
import { modeItems, modeStats, navItems } from './header.data.js'
import HeaderNavContext from '@/shared/context/HeaderNavContext.js'
import HeaderNav from '@/features/HeaderNav'
import HeaderBrand from '@/shared/ui/Header/HeaderBrand'
import GlowEffect from '@/shared/ui/GlowEffect'
import CustomSelect from '@/shared/ui/CustomSelect'
import { DEFAULT_LANGUAGE, getLanguageFromPathname } from '@/i18n'
import mobileLogo from '@/widgets/Header/assets/logo.png'

export default function Header() {
    const { pathname } = useLocation()
    const navigate = useNavigate()
    const currentLanguage = getLanguageFromPathname(pathname)
    const homePath = `/${currentLanguage}`
    const localizedNavItems = navItems.map((item) => (
        item.key === 'home' ? { ...item, to: homePath } : item
    ))
    const activeMode = getActiveItemKey(modeItems, pathname)
    const activePage = activeMode ? null : getActiveItemKey(localizedNavItems, pathname)
    const activeModeItem = modeItems.find((item) => item.key === activeMode) || modeItems[0]
    const mobileModeOptions = modeItems.map((item) => ({
        value: item.to,
        label: item.label,
        icon: item.icon,
    }))
    const languageOptions = [
        { value: 'ru', label: 'RU' },
        { value: 'en', label: 'EN' },
    ]

    const handleLanguageChange = (nextLanguage) => {
        if (nextLanguage === currentLanguage) {
            return
        }

        const nextPath = pathname === `/${currentLanguage}` || pathname === '/'
            ? `/${nextLanguage}`
            : `/${nextLanguage || DEFAULT_LANGUAGE}`

        navigate(nextPath)
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
                        options={languageOptions}
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
            <nav className="mobile-bottom-nav" aria-label="Мобильная навигация">
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
                    options={languageOptions}
                    menuPlacement="top"
                    onChange={handleLanguageChange}
                />
            </nav>
        </GlowEffect>
    )
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
