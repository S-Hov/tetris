import { Link } from 'react-router-dom'

import GlowEffect from '@/shared/ui/GlowEffect'
import supportBanner from '@/shared/assets/support/support-banner.png'

import './ProfileSupportPanel.css'

const ProfileSupportPanel = ({ currentLanguage, t }) => (
    <GlowEffect className="profile-panel-glow">
        <section className="profile-support-panel" style={{ '--profile-support-bg': `url(${supportBanner})` }}>
            <div className="profile-support-panel__content">
                <span className="profile-support-panel__eyebrow">{t('profile.support.eyebrow')}</span>
                <h2>{t('profile.support.title')}</h2>
                <p>{t('profile.support.description')}</p>
                <div className="profile-support-panel__actions">
                    <Link className="button profile-support-panel__primary" to={`/${currentLanguage}/support`}>
                        <i className="fas fa-paper-plane"></i>
                        {t('profile.support.createRequest')}
                    </Link>
                    <Link className="button profile-support-panel__secondary" to="/support/requests">
                        <i className="fas fa-list-check"></i>
                        {t('profile.support.myRequests')}
                    </Link>
                </div>
            </div>
        </section>
    </GlowEffect>
)

export default ProfileSupportPanel
