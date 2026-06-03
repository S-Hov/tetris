import { Link } from 'react-router-dom'

import './AccountSettingsHeader.css'

const AccountSettingsHeader = ({ t }) => (
    <div className="account-settings-topbar">
        <div>
            <p className="account-settings-eyebrow">{t('accountSettings.hero.eyebrow')}</p>
            <h1>{t('accountSettings.hero.title')}</h1>
        </div>
        <Link to="/profile" className="button account-settings-back">
            <i className="fas fa-arrow-left"></i>
            {t('accountSettings.common.profile')}
        </Link>
    </div>
)

export default AccountSettingsHeader
