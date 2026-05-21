import { Link, useLocation } from 'react-router-dom'

import CyberBg from '@/features/CyberBg'
import HeroHeader from '@/widgets/Header/HeroHeader'
import SiteFooter from '@/shared/ui/SiteFooter'

const MainLayout = ({ children, hideFooter = false }) => {
    const location = useLocation()
    const showControlsLink = (
        location.pathname.startsWith('/game/') ||
        location.pathname.startsWith('/match/')
    ) && !location.pathname.startsWith('/game/controls')

    return (
        <>
            <CyberBg />
            <HeroHeader />
            <main className="main-layout__main">
                {showControlsLink ? (
                    <Link className="mobile-controls-link" to="/game/controls" aria-label="Настройки мобильного управления">
                        <i className="fas fa-gear"></i>
                    </Link>
                ) : null}
                {children}
                {!hideFooter && <SiteFooter />}
            </main>
        </>
    )
}

export default MainLayout
