import ActivityFeed from '@/widgets/ActivityFeed'
import './SideRailLayout.css'

const SideRailLayout = ({ children }) => {
    return (
        <div className="side-rail-layout">
            <div className="side-rail-layout__rail side-rail-layout__rail--left">
                <ActivityFeed />
            </div>

            <div className="side-rail-layout__content">
                {children}
            </div>
        </div>
    )
}

export default SideRailLayout
