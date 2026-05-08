import { useContext } from 'react'
import { NavLink } from 'react-router-dom'
import HeaderNavContext from '@/shared/context/HeaderNavContext'

const HeaderLink = ({ item, type = 'nav' }) => {
    const {
        activePage,
        activeMode,
    } = useContext(HeaderNavContext)

    const isActive = type === 'nav'
        ? activePage === item.key
        : activeMode === item.key

    const className = type === 'nav'
        ? `nav-link header-nav-btn btn-hover-shine button ${isActive ? 'active-page' : ''}`
        : `mode-btn header-nav-btn btn-hover-shine button ${isActive ? 'active-page' : ''}`

    return (
        <NavLink to={item.to} className={className} aria-label={item.label} title={item.label}>
            <i className={item.icon} aria-hidden="true"></i>
            <span className="header-nav-label">{item.label}</span>
        </NavLink>
    )
}

export default HeaderLink
