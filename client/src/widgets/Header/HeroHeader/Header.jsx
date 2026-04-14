import { useEffect, useState } from 'react'
import './Header.css'
import { modeItems, modeStats, navItems } from './header.data.js'
import HeaderNavContext from '../../../shared/context/HeaderNavContext.js'
import HeaderNav from '../../../features/HeaderNav/index.js'
import HeaderBrand from '../../../shared/ui/HeaderBrand/index.js'
import { parseKValue, formatNumberValue } from './header.utils.js'

export default function Header() {
    const [activePage, setActivePage] = useState('home')
    const [activeMode, setActiveMode] = useState(null)
    const [liveStats, setLiveStats] = useState(() =>
        Object.fromEntries(
            Object.entries(modeStats).map(([modeKey, modeValue]) => [modeKey, { ...modeValue }]),
        ),
    )
    const [bgStyle, setBgStyle] = useState({})

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

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = ((e.clientX - rect.left) / rect.width) * 100
        const y = ((e.clientY - rect.top) / rect.height) * 100

        setBgStyle({
            background: `radial-gradient(circle at ${x}% ${y}%, rgba(0, 255, 255, 0.15), rgba(8, 12, 25, 0.6))`,
        })
    }

    const handleMouseLeave = () => {
        setBgStyle({})
    }

    return (
        <header
            className="header"
            style={bgStyle}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
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
    )
}
