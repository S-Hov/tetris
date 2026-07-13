import { formatStatus } from '../../profile.utils.js'
import ProfilePanel from '../ProfilePanel/ProfilePanel.jsx'
import '../ProfileAccountPanel/ProfileAccountPanel.css'
import './PublicProfileAccountPanel.css'

const PublicProfileAccountPanel = ({ profile, t }) => (
    <ProfilePanel className="profile-account-panel public-profile-account-panel" title={t('profile.account.title')}>
        <div className="profile-account-grid public-profile-account-grid">
            <InfoLine label={t('profile.public.createdAt')} value={profile.memberSince.full} icon="fas fa-calendar-plus" />
            <InfoLine label={t('profile.account.lastLogin')} value={profile.lastLogin} icon="fas fa-clock" />
            <InfoLine label={t('profile.account.status')} value={formatStatus(profile.status, t)} icon="fas fa-shield-halved" />
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

export default PublicProfileAccountPanel
