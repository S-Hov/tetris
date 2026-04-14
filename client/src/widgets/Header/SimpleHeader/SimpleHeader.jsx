import { simpleHeaderConfig } from './simpleHeader.data'
import { Link, useLocation } from 'react-router-dom'

import './SimpleHeader.css'
import HeaderBrand from '../../../shared/ui/HeaderBrand'


export default function SimpleHeader() {
    const location = useLocation()

    const currentConfig = simpleHeaderConfig[location.pathname] || {
        backTo: '/',
        backLabel: 'На главную',
    }

    return (
        <header className="header">
            <div className="header-border-glow"></div>

            <div className="header-content">
                <HeaderBrand description={false} />

                <Link to={currentConfig.backTo} className="back-link button btn-hover-shine">
                    <i className="fas fa-arrow-left"></i> {currentConfig.backLabel}
                </Link>
            </div>

            <div className="glow-line" />
        </header>
    )
}