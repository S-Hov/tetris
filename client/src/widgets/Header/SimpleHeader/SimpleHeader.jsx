import { simpleHeaderConfig } from './simpleHeader.data'
import { Link, useLocation } from 'react-router-dom'

import './SimpleHeader.css'
import HeaderBrand from '@/shared/ui/Header/HeaderBrand'
import GlowEffect from '@/shared/ui/GlowEffect'


export default function SimpleHeader() {
    const location = useLocation()
    const activeConfig = simpleHeaderConfig.find((config) => config.match(location.pathname))

    const currentConfig = activeConfig || {
        backTo: '/',
        backLabel: 'На главную',
    }
    const primaryTo = typeof currentConfig.backTo === 'function'
        ? currentConfig.backTo(location.pathname)
        : currentConfig.backTo
    const secondaryTo = typeof currentConfig.secondaryTo === 'function'
        ? currentConfig.secondaryTo(location.pathname)
        : currentConfig.secondaryTo

    return (
        <GlowEffect>
            <header className="header">
                <div className="header-border-glow"></div>

                <div className="header-content">
                    <HeaderBrand description={false} />
                    <nav className="simple-header-nav">
                        <Link to={primaryTo} className="back-link button">
                            <i className="fas fa-arrow-left"></i> {currentConfig.backLabel}
                        </Link>
                        {
                            activeConfig && secondaryTo
                                ? <Link to={secondaryTo} className="back-link button ">
                                    <i className="fas fa-arrow-left"></i> {currentConfig.secondaryLabel || 'На главную'}
                                </Link>
                                : null
                        }
                    </nav>
                </div>

                <div className="glow-line" />
            </header>
        </GlowEffect>
    )
}
