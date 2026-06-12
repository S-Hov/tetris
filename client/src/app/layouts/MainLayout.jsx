import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import CyberBg from '@/features/CyberBg'
import HeroHeader from '@/widgets/Header/HeroHeader'
import SiteFooter from '@/shared/ui/SiteFooter'
import { getLocalizedGamePath } from '@/i18n'
import SideRailLayout from './SideRailLayout.jsx'

const MainLayout = ({ children, hideFooter = false }) => {
    const location = useLocation()
    const { t } = useTranslation()
    const normalizedPathname = location.pathname.replace(/^\/(ru|en)(?=\/game(?:\/|$))/, '')
    const isGamePlayPage = (
        normalizedPathname === '/game/solo/play' ||
        location.pathname.startsWith('/match/')
    )
    const showControlsLink = (
        normalizedPathname.startsWith('/game/') ||
        location.pathname.startsWith('/match/')
    ) && !normalizedPathname.startsWith('/game/controls') && !isGamePlayPage
    const content = (
        <>
            {children}
            {!hideFooter && <SiteFooter />}
        </>
    )

    return (
        <>
            <CyberBg />
            <HeroHeader />
            <main className={`main-layout__main ${isGamePlayPage ? 'main-layout__main--game' : ''}`}>
                {showControlsLink ? (
                    <Link className="mobile-controls-link" to={getLocalizedGamePath('/game/controls')} aria-label={t('gameControls.settings.mobileTitle')}>
                        <i className="fas fa-gear"></i>
                    </Link>
                ) : null}
                {isGamePlayPage ? content : (
                    <SideRailLayout>
                        {content}
                    </SideRailLayout>
                )}
            </main>
        </>
    )
}

export default MainLayout
