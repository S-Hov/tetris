import { formatStatus } from '../../profile.utils.js'
import ProfilePanel from '../ProfilePanel/ProfilePanel.jsx'
import './ProfileAccountPanel.css'

const ProfileAccountPanel = ({ onLogout, profile, t }) => (
    <ProfilePanel className="profile-account-panel" title={t('profile.account.title')}>
        <div className="profile-account-grid">
            <InfoLine label={t('profile.account.email')} value={profile.email || t('profile.common.notSpecified')} icon="fas fa-envelope" />
            <InfoLine label={t('profile.account.lastLogin')} value={profile.lastLogin} icon="fas fa-clock" />
            <InfoLine label={t('profile.account.status')} value={formatStatus(profile.status, t)} icon="fas fa-shield-halved" />
            <button type="button" className="profile-logout" onClick={onLogout}>
                <i className="fas fa-right-from-bracket"></i>
                {t('profile.account.logout')}
            </button>
        </div>
    </ProfilePanel>
)

const InfoLine = ({ icon, label, value }) => (
    <div className="profile-info-line">
        <i className={icon}></i>
        <span>{label}</span>
        <strong>{value}</strong>
    </div>
)

export default ProfileAccountPanel
