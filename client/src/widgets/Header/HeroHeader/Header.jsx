import { useEffect, useState } from 'react'
import './Header.css'
import { modeItems, modeStats, navItems } from './header.data.js'
import HeaderNavContext from '../../../shared/context/HeaderNavContext.js'
import HeaderNav from '../../../features/HeaderNav'
import HeaderBrand from '../../../shared/ui/Header/HeaderBrand'
import { parseKValue, formatNumberValue } from './header.utils.js'
import GlowEffect from '../../../shared/ui/GlowEffect'

export default function Header() {
    const [activePage, setActivePage] = useState('home')
    const [activeMode, setActiveMode] = useState(null)
    const [liveStats, setLiveStats] = useState(() =>
        Object.fromEntries(
            Object.entries(modeStats).map(([modeKey, modeValue]) => [modeKey, { ...modeValue }]),
        ),
    )

    const contextValue = {
        activePage,
        setActivePage,
        activeMode,
        setActiveMode,
        navItems,
        modeItems,
        modeStats,
    }

    useEffect(() => {
        const intervalId = setInterval(() => {
            setLiveStats((prev) => {
                if (!activeMode) return prev
                const currentModeStats = prev[activeMode] ?? modeStats[activeMode]
                if (!currentModeStats) return prev
                const currentOnline = parseKValue(currentModeStats.online)
                const currentLobbies = parseKValue(currentModeStats.lobbies)

                const nextOnline = Math.max(300, Math.min(15000, currentOnline + Math.floor(Math.random() * 200) - 60))
                const nextLobbies = Math.max(10, Math.min(500, currentLobbies + Math.floor(Math.random() * 12) - 2))

                return {
                    ...prev,
                    [activeMode]: {
                        ...currentModeStats,
                        online: formatNumberValue(nextOnline, true),
                        lobbies: formatNumberValue(nextLobbies, true),
                    },
                }
            })
        }, 8000)

        return () => clearInterval(intervalId)
    }, [activeMode])

    const stats = activeMode ? liveStats[activeMode] ?? modeStats[activeMode] : null

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

                    {stats && (
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
                    )}
                </div>

                <div className="glow-line" />
            </header>
        </GlowEffect>
    )
}
