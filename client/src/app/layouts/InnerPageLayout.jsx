import CyberBg from '@/features/CyberBg'
import SimpleHeader from '@/widgets/Header/SimpleHeader'
import SiteFooter from '@/shared/ui/SiteFooter'
import SideRailLayout from './SideRailLayout.jsx'

const InnerPageLayout = ({ children, hideFooter = false }) => {
    return (
        <>
            <CyberBg />
            <SimpleHeader />
            <main>
                <SideRailLayout>
                    {children}
                    {!hideFooter && <SiteFooter />}
                </SideRailLayout>
            </main>
            
        </>
    )
}

export default InnerPageLayout
