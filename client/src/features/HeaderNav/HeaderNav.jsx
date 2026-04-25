import { useContext } from 'react'
import HeaderNavContext from '@/shared/context/HeaderNavContext.js'
import HeaderLink from '@/shared/ui/Header/HeaderLink/index.js'

import './HeaderNav.css'

const HeaderNav = ({ type = 'nav' }) => {
    const { navItems, modeItems } = useContext(HeaderNavContext)

    const items = type === 'nav' ? navItems : modeItems
    const className = type === 'nav' ? 'nav-menu header-nav' : 'modes-nav header-nav'

    return (
        <nav className={className}>
            {items.map((item) => (
                <HeaderLink key={item.key} item={item} type={type} />
            ))}
        </nav>
    )
}

export default HeaderNav
