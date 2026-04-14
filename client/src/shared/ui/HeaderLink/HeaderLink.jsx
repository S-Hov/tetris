import { useContext } from 'react'
import { NavLink } from 'react-router-dom'
import HeaderNavContext from '../../context/HeaderNavContext'

const HeaderLink = ({ item, type = 'nav' }) => {
    const {
        activePage,
        setActivePage,
        activeMode,
        setActiveMode,
    } = useContext(HeaderNavContext)

    const handleClick = () => {
        if (type === 'nav') {
            setActivePage(item.key)
            setActiveMode(null)
        } else if (type === 'mode') {
            setActiveMode(item.key)
            setActivePage(null)
        }
    }

    const isActive = type === 'nav'
        ? activePage === item.key
        : activeMode === item.key

    const className = type === 'nav'
        ? `nav-link header-nav-btn btn-hover-shine button ${isActive ? 'active-page' : ''}`
        : `mode-btn header-nav-btn btn-hover-shine button ${isActive ? 'active-page' : ''}`

    return (
        <NavLink to={item.to} className={className} onClick={handleClick}>
            <i className={item.icon}></i> {item.label}
        </NavLink>
    )
}

export default HeaderLink
