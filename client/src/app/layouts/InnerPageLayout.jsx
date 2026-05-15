import CyberBg from '@/features/CyberBg'
import SimpleHeader from '@/widgets/Header/SimpleHeader'
import SiteFooter from '@/shared/ui/SiteFooter'

const InnerPageLayout = ({ children, hideFooter = false }) => {
    return (
        <>
            <CyberBg />
            <SimpleHeader />
            <main>
                {children}
                {!hideFooter && <SiteFooter />}
            </main>
            
        </>
    )
}

export default InnerPageLayout
