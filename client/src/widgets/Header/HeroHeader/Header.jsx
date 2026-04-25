import { useLocation } from 'react-router-dom'
import './Header.css'
import { modeItems, modeStats, navItems } from './header.data.js'
import HeaderNavContext from '@/shared/context/HeaderNavContext.js'
import HeaderNav from '@/features/HeaderNav'
import HeaderBrand from '@/shared/ui/Header/HeaderBrand'
import GlowEffect from '@/shared/ui/GlowEffect'

export default function Header() {
    const { pathname } = useLocation()
    const activeMode = getActiveItemKey(modeItems, pathname)
    const activePage = activeMode ? null : getActiveItemKey(navItems, pathname)

    const contextValue = {
        activePage,
        activeMode,
        navItems,
        modeItems,
        modeStats,
    }

    return (
        <GlowEffect >
            <header
                className="header"
            >
                <div className="header-content">
                    <HeaderBrand />
                    <HeaderNavContext.Provider value={contextValue}>
                        <HeaderNav type="nav" />
                        <HeaderNav type="mode" />
                    </HeaderNavContext.Provider>

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
