import CyberBg from '@/features/CyberBg'
import HeroHeader from '@/widgets/Header/HeroHeader'

const MainLayout = ({ children }) => {
    return (
        <>
            <CyberBg />
            <HeroHeader />
            <main>{children}</main>
        </>
    )
}

export default MainLayout