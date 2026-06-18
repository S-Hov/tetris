import { NavLink } from 'react-router-dom'

import './NavigationTabs.css'

const NavigationTabs = ({ ariaLabel, getItemPath, items, t }) => (
    <nav
        className="navigation-tabs"
        aria-label={ariaLabel}
        style={{ '--navigation-tabs-columns': items.length }}
    >
        {items.map((item) => (
            <NavLink
                key={item.key}
                to={getItemPath(item)}
                className={({ isActive }) => isActive ? 'is-active' : undefined}
            >
                <i className={item.icon}></i>
                {t(item.labelKey)}
            </NavLink>
        ))}
    </nav>
)

export default NavigationTabs
