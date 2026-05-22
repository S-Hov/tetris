import { Link, useLocation } from 'react-router-dom'
import activeMenuBorder from '@/pages/Profile/assets/menu/active_border.png'
import './ProfileSideNav.css'

const PROFILE_NAV_ITEMS = [
    { key: 'profile', label: 'Профиль', icon: 'fas fa-user', to: '/profile' },
    { key: 'stats', label: 'Статистика', icon: 'fas fa-chart-line', to: '/profile#profile-stats' },
    { key: 'matches', label: 'Матчи', icon: 'fas fa-gamepad', to: '/matches' },
    { key: 'settings', label: 'Настройки', icon: 'fas fa-gear', to: '/account-settings' },
]

const ProfileSideNav = () => {
    const location = useLocation()

    return (
        <aside className="profile-sidebar" style={{ '--profile-menu-active-border': `url(${activeMenuBorder})` }} aria-label="Меню профиля">
            {PROFILE_NAV_ITEMS.map((item) => (
                <Link
                    key={item.key}
                    className={`profile-sidebar__item ${isItemActive(item.key, location) ? 'profile-sidebar__item--active' : ''}`}
                    to={item.to}
                >
                    <i className={item.icon}></i>
                    <span>{item.label}</span>
                </Link>
            ))}
        </aside>
    )
}

const isItemActive = (key, location) => {
    if (key === 'stats') {
        return location.pathname === '/profile' && location.hash === '#profile-stats'
    }

    if (key === 'profile') {
        return location.pathname === '/profile' && location.hash !== '#profile-stats'
    }

    if (key === 'matches') {
        return location.pathname.startsWith('/matches')
    }

    if (key === 'settings') {
        return location.pathname.startsWith('/account-settings')
    }

    return false
}

export default ProfileSideNav
