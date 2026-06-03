import ProfilePanel from '../ProfilePanel/ProfilePanel.jsx'
import './ProfileStatsPanel.css'

const ProfileStatsPanel = ({ stats, t }) => (
    <ProfilePanel id="profile-stats" title={t('profile.stats.title')}>
        <div className="profile-stat-grid">
            {stats.map((stat) => (
                <article key={stat.key} className="profile-stat-tile">
                    <span className="profile-stat-tile__icon"><i className={stat.icon}></i></span>
                    <div>
                        <span>{stat.label}</span>
                        <strong>{stat.value}</strong>
                        <small>{stat.note}</small>
                    </div>
                </article>
            ))}
        </div>
    </ProfilePanel>
)

export default ProfileStatsPanel
