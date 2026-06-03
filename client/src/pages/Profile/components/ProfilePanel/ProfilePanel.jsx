import GlowEffect from '@/shared/ui/GlowEffect'

import './ProfilePanel.css'

const ProfilePanel = ({ action = null, children, className = '', id, title }) => (
    <GlowEffect className="profile-panel-glow">
        <section className={`profile-panel ${className}`.trim()} id={id}>
            <header className="profile-panel__header">
                <h2>{title}</h2>
                {action}
            </header>
            {children}
        </section>
    </GlowEffect>
)

export default ProfilePanel
