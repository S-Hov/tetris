import { useEffect, useState } from 'react'
import './Header.css'
import { modeItems, modeStats, navItems } from './header.data.js'

export default function Header() {
    const [activePage, setActivePage] = useState('home')
    const [activeMode, setActiveMode] = useState(null)
    const [stats, setStats] = useState(modeStats['1v1'])
    const [bgStyle, setBgStyle] = useState({})

    useEffect(() => {
        const intervalId = setInterval(() => {
            setStats((prev) => {
                const currentOnline = parseKValue(prev.online)
                const currentLobbies = parseKValue(prev.lobbies)

                const nextOnline = Math.max(300, Math.min(15000, currentOnline + Math.floor(Math.random() * 200) - 60))
                const nextLobbies = Math.max(10, Math.min(500, currentLobbies + Math.floor(Math.random() * 12) - 2))

                return {
                    ...prev,
                    online: formatNumberValue(nextOnline, true),
                    lobbies: formatNumberValue(nextLobbies, true),
                }
            })
        }, 8000)

        return () => clearInterval(intervalId)
    }, [])

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
                <div className="brand">
                    <div className="tetris-icon">
                        <i className="fas fa-cubes"></i>
                    </div>

                    <div className="logo-text">
                        <h1 className='glow-text'>⚡ PVP TETRIS ⚡</h1>
                        <p className='description'>BATTLE ARENA • NEO TOURNAMENT</p>
                    </div>
                </div>

                <nav className="nav-menu header-nav">
                    {navItems.map((item) => (
                        <button
                            key={item.key}
                            className={`nav-link header-nav-btn btn-hover-shine ${activePage === item.key ? 'active-page' : ''}`}
                            onClick={() => {
                                setActivePage(item.key);
                                setActiveMode(null);
                            }}
                        >
                            <i className={item.icon}></i> {item.label}
                        </button>
                    ))}
                </nav>

                <nav className="modes-nav header-nav">
                    {modeItems.map((item) => (
                        <button
                            key={item.key}
                            className={`mode-btn header-nav-btn btn-hover-shine ${activeMode === item.key ? 'active-page' : ''}`}
                            onClick={() => {
                                setActiveMode(item.key)
                                setActivePage(null)
                                setStats(modeStats[item.key])
                            }}
                        >
                            <i className={item.icon}></i> {item.label}
                        </button>
                    ))}
                </nav>

                {activeMode && (
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

function parseKValue(str) {
    if (typeof str !== 'string') str = String(str)
    str = str.trim().toLowerCase()

    if (str.includes('k')) {
        const num = parseFloat(str.replace('k', ''))
        if (!Number.isNaN(num)) return num * 1000
    }

    return parseInt(str, 10)
}

function formatNumberValue(num, isKFormat) {
    if (isKFormat && num >= 1000) {
        let kVal = (num / 1000).toFixed(1)
        if (kVal.endsWith('.0')) kVal = kVal.slice(0, -2)
        return `${kVal}k`
    }

    return String(num)
}