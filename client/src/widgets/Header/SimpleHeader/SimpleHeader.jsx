import { simpleHeaderConfig } from './simpleHeader.data'
import { Link, useLocation } from 'react-router-dom'

import './SimpleHeader.css'
import HeaderBrand from '../../../shared/ui/Header/HeaderBrand'
import GlowEffect from '../../../shared/ui/GlowEffect'


export default function SimpleHeader() {
    const location = useLocation()

    const currentConfig = simpleHeaderConfig[location.pathname] || {
        backTo: '/',
        backLabel: 'На главную',
    }

    return (
        <GlowEffect>
            <header className="header">
                <div className="header-border-glow"></div>

                <div className="header-content">
                    <HeaderBrand description={false} />
                    <nav className="simple-header-nav">
                        <Link to={currentConfig.backTo} className="back-link button">
                            <i className="fas fa-arrow-left"></i> {currentConfig.backLabel}
                        </Link>
                        {
                            simpleHeaderConfig[location.pathname]
                                ? <Link to="/" className="back-link button ">
                                    <i className="fas fa-arrow-left"></i> На главную
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