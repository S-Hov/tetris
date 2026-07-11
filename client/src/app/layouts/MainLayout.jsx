import { useLocation } from 'react-router-dom'

import CyberBg from '@/features/CyberBg'
import HeroHeader from '@/widgets/Header/HeroHeader'
import SiteFooter from '@/shared/ui/SiteFooter'
import { stripLanguageFromPathname } from '@/i18n'
import SideRailLayout from './SideRailLayout.jsx'

const MainLayout = ({ children, hideFooter = false }) => {
    const location = useLocation()
    const normalizedPathname = stripLanguageFromPathname(location.pathname)
    const isGamePlayPage = (
        normalizedPathname === '/game/solo/play' ||
        normalizedPathname === '/effects/preview' ||
        normalizedPathname.startsWith('/match/')
    )
    const content = (
        <>
            {children}
            {!hideFooter && <SiteFooter />}
        </>
    )

    return (
        <>
            <CyberBg />
            {!isGamePlayPage && <HeroHeader />}
            <main className={`main-layout__main ${isGamePlayPage ? 'main-layout__main--game' : ''}`}>
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
