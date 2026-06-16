import { Link, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLanguageFromPathname, getLocalizedPath, stripLanguageFromPathname } from '@/i18n'
import activeMenuBorder from '@/pages/Profile/assets/menu/active_border.png'
import './ProfileSideNav.css'

const PROFILE_NAV_ITEMS = [
    { key: 'profile', labelKey: 'profile.sideNav.profile', icon: 'fas fa-user', to: '/profile' },
    // { key: 'stats', labelKey: 'profile.sideNav.stats', icon: 'fas fa-chart-line', to: '/profile#profile-stats' },
    { key: 'matches', labelKey: 'profile.sideNav.matches', icon: 'fas fa-gamepad', to: '/matches' },
    { key: 'friends', labelKey: 'profile.sideNav.friends', icon: 'fas fa-user-group', to: '/friends/friends' },
    { key: 'settings', labelKey: 'profile.sideNav.settings', icon: 'fas fa-gear', to: '/account-settings/general' },
]

const ProfileSideNav = () => {
    const location = useLocation()
    const { t } = useTranslation()
    const lang = getLanguageFromPathname(location.pathname)
    const profilePath = `/${lang}/profile`

    return (
        <aside className="profile-sidebar" style={{ '--profile-menu-active-border': `url(${activeMenuBorder})` }} aria-label={t('profile.sideNav.ariaLabel')}>
            {PROFILE_NAV_ITEMS.map((item) => (
                <Link
                    key={item.key}
                    className={`profile-sidebar__item ${isItemActive(item.key, location) ? 'profile-sidebar__item--active' : ''}`}
                    to={getItemPath(item, profilePath)}
                    >
                    <i className={item.icon}></i>
                    <span>{t(item.labelKey)}</span>
                    {isItemActive(item.key, location) ? <div className="border-glow"></div> : ''}
                </Link>
            ))}
        </aside>
    )
}

const getItemPath = (item, profilePath) => {
    if (item.key === 'profile') return profilePath
    if (item.key === 'stats') return `${profilePath}#profile-stats`

    return getLocalizedPath(item.to)
}

const isItemActive = (key, location) => {
    const pathname = stripLanguageFromPathname(location.pathname)

    if (key === 'stats') {
        return isProfilePath(pathname) && location.hash === '#profile-stats'
    }

    if (key === 'profile') {
        return isProfilePath(pathname) && location.hash !== '#profile-stats'
    }

    if (key === 'matches') {
        return pathname.startsWith('/matches')
    }

    if (key === 'settings') {
        return pathname.startsWith('/account-settings')
    }

    if (key === 'friends') {
        return pathname.startsWith('/friends')
    }

    return false
}

const isProfilePath = (pathname) => pathname === '/profile'

export default ProfileSideNav
