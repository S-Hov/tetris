import { Link, useLocation } from 'react-router-dom'

import CyberBg from '@/features/CyberBg'
import HeroHeader from '@/widgets/Header/HeroHeader'
import SiteFooter from '@/shared/ui/SiteFooter'

const MainLayout = ({ children, hideFooter = false }) => {
    const location = useLocation()
    const isGamePlayPage = (
        location.pathname === '/game/solo/play' ||
        location.pathname.startsWith('/match/')
    )
    const showControlsLink = (
        location.pathname.startsWith('/game/') ||
        location.pathname.startsWith('/match/')
    ) && !location.pathname.startsWith('/game/controls') && !isGamePlayPage

    return (
        <>
            <CyberBg />
            <HeroHeader />
            <main className={`main-layout__main ${isGamePlayPage ? 'main-layout__main--game' : ''}`}>
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
