import CyberBg from '@/features/CyberBg'
import HeroHeader from '@/widgets/Header/HeroHeader'
import SiteFooter from '@/shared/ui/SiteFooter'

const MainLayout = ({ children, hideFooter = false }) => {
    return (
        <>
            <CyberBg />
            <HeroHeader />
            <main>
                {children}
                {!hideFooter && <SiteFooter />}
            </main>
        </>
    )
}

export default MainLayout
