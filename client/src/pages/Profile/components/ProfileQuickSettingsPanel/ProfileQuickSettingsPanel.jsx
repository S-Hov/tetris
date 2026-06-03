import { Link } from 'react-router-dom'

import AppSwitch from '@/shared/ui/AppSwitch'
import InterfaceLanguageSelect from '@/shared/ui/InterfaceLanguageSelect'

import ProfilePanel from '../ProfilePanel/ProfilePanel.jsx'
import './ProfileQuickSettingsPanel.css'

const ProfileQuickSettingsPanel = ({
    isDarkTheme,
    isGlowEffectEnabled,
    onGlowEffectToggle,
    onThemeToggle,
    t,
}) => (
    <ProfilePanel
        className="profile-quick-settings-panel"
        title={t('profile.settings.title')}
        action={<Link to="/account-settings">{t('profile.settings.all')}</Link>}
    >
        <div className="profile-quick-settings-grid">
            <div className="profile-settings-toggle profile-language-setting">
                <span className="profile-settings-toggle__icon"><i className="fas fa-language"></i></span>
                <span>
                    <strong>{t('profile.settings.language')}</strong>
                    <small>{t('profile.settings.languageDescription')}</small>
                </span>
                <InterfaceLanguageSelect className="profile-language-select" />
            </div>
            <button
                type="button"
                className="profile-settings-toggle"
                aria-pressed={isDarkTheme}
                onClick={onThemeToggle}
            >
                <span className="profile-settings-toggle__icon"><i className="fas fa-moon"></i></span>
                <span>
                    <strong>{t('profile.settings.darkTheme')}</strong>
                    <small>{t('profile.settings.darkThemeDescription')}</small>
                </span>
                <AppSwitch checked={isDarkTheme} />
            </button>
            <button
                type="button"
                className="profile-settings-toggle"
                aria-pressed={isGlowEffectEnabled}
                onClick={onGlowEffectToggle}
            >
                <span className="profile-settings-toggle__icon"><i className="fas fa-wand-magic-sparkles"></i></span>
                <span>
                    <strong>{t('profile.settings.glow')}</strong>
                    <small>{t('profile.settings.glowDescription')}</small>
                </span>
                <AppSwitch checked={isGlowEffectEnabled} />
            </button>
        </div>
    </ProfilePanel>
)

export default ProfileQuickSettingsPanel
