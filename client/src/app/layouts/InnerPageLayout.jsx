import CyberBg from '../../features/CyberBg'
import SimpleHeader from '../../widgets/Header/SimpleHeader'

const InnerPageLayout = ({ children }) => {
    return (
        <>
            <CyberBg />
            <SimpleHeader />
            <main>{children}</main>
        </>
    )
}

export default InnerPageLayout