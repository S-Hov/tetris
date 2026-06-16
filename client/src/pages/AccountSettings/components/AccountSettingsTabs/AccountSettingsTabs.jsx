import { NavLink } from 'react-router-dom'

import { getLocalizedPath } from '@/i18n'
import { ACCOUNT_SETTINGS_SECTIONS } from '../../accountSettingsPage.config.js'
import './AccountSettingsTabs.css'

const AccountSettingsTabs = ({ t }) => (
    <nav className="account-settings-tabs" aria-label={t('accountSettings.tabs.aria')}>
        {ACCOUNT_SETTINGS_SECTIONS.map((section) => (
            <NavLink
                key={section.key}
                to={getLocalizedPath(`/account-settings/${section.key}`)}
                className={({ isActive }) => isActive ? 'is-active' : undefined}
            >
                <i className={section.icon}></i>
                {t(section.labelKey)}
            </NavLink>
        ))}
    </nav>
)

export default AccountSettingsTabs
