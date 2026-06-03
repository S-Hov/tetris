import GlowEffect from '@/shared/ui/GlowEffect'

import { AVATAR_ACCEPT } from '../../accountSettingsPage.config.js'
import { formatStatus, isVideoAvatar } from '../../accountSettings.utils.js'
import './AccountProfileSection.css'

const AccountProfileSection = ({
    avatarInputRef,
    avatarPreview,
    isSavingProfile,
    onAvatarChange,
    onEmailModalOpen,
    onProfileFormChange,
    onProfileSave,
    profile,
    profileForm,
    t,
}) => (
    <section className="account-settings-panel">
        <GlowEffect>
            <form className="glow-effect account-profile-form" onSubmit={onProfileSave}>
                <div className="account-avatar-block">
                    <div className="account-avatar">
                        {avatarPreview || profile.avatarUrl ? (
                            <AccountAvatarMedia src={avatarPreview || profile.avatarUrl} alt={profile.name} />
                        ) : (
                            <i className="fas fa-user-astronaut"></i>
                        )}
                    </div>
                    <button
                        type="button"
                        className="account-avatar-edit"
                        aria-label={t('accountSettings.profile.avatarAria')}
                        onClick={() => avatarInputRef.current?.click()}
                    >
                        <i className="fas fa-pen"></i>
                    </button>
                    <input
                        ref={avatarInputRef}
                        type="file"
                        accept={AVATAR_ACCEPT}
                        onChange={onAvatarChange}
                    />
                </div>

                <label className="account-field account-field--username">
                    <span>{t('accountSettings.profile.nickname')}</span>
                    <input
                        type="text"
                        value={profileForm.username}
                        maxLength={32}
                        onChange={(event) => onProfileFormChange({ username: event.target.value })}
                    />
                </label>

                <button type="submit" className="button account-save-button" disabled={isSavingProfile}>
                    <i className="fas fa-save"></i>
                    {isSavingProfile ? t('accountSettings.common.saving') : t('accountSettings.common.save')}
                </button>

                <div className="account-info-grid">
                    <InfoRow label={t('accountSettings.profile.email')} value={profile.email}>
                        <button type="button" onClick={onEmailModalOpen}>
                            {t('accountSettings.common.change')}
                        </button>
                    </InfoRow>
                    <InfoRow label={t('accountSettings.profile.country')} value={profile.country} />
                    <InfoRow label={t('accountSettings.profile.status')} value={formatStatus(profile.status, t)} />
                </div>
            </form>
        </GlowEffect>
    </section>
)

const AccountAvatarMedia = ({ alt, src }) => {
    if (isVideoAvatar(src)) {
        return <video src={src} autoPlay loop muted playsInline aria-label={alt} />
    }

    return <img src={src} alt={alt} />
}

const InfoRow = ({ children, label, value }) => (
    <div className="account-info-row">
        <span>{label}</span>
        <strong>{value}</strong>
        {children}
    </div>
)

export default AccountProfileSection
