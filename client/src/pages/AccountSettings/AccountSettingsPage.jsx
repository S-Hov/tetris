import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import GlowEffect from '@/shared/ui/GlowEffect'
import AppSwitch from '@/shared/ui/AppSwitch'
import InterfaceLanguageSelect from '@/shared/ui/InterfaceLanguageSelect'
import ProfileSideNav from '@/widgets/ProfileSideNav'
import { useAuth } from '@/shared/hooks/useAuth'
import { useGlowEffect } from '@/shared/hooks/useGlowEffect.js'
import { useTheme } from '@/shared/hooks/useTheme.js'
import { authenticationAPI } from '@/shared/api/auth'
import { settingsAPI } from '@/shared/api/settings'
import notify from '@/utils/Notifications'
import './AccountSettingsPage.css'

const AVATAR_MAX_SIZE = 2 * 1024 * 1024
const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/avif', 'video/webm']

const AccountSettingsPage = () => {
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()
    const avatarInputRef = useRef(null)
    const { checkAuth, logout, setUser, user } = useAuth()
    const { isGlowEffectEnabled, toggleGlowEffect } = useGlowEffect()
    const { isDarkTheme, toggleTheme } = useTheme()
    const [activeTab, setActiveTab] = useState('general')
    const [profileForm, setProfileForm] = useState({ username: '' })
    const [avatarFile, setAvatarFile] = useState(null)
    const [avatarPreview, setAvatarPreview] = useState('')
    const [isSavingProfile, setIsSavingProfile] = useState(false)
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false)
    const [nextEmail, setNextEmail] = useState('')
    const [isChangingEmail, setIsChangingEmail] = useState(false)
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    })
    const [isSavingPassword, setIsSavingPassword] = useState(false)
    const [loginHistory, setLoginHistory] = useState([])
    const [isHistoryLoading, setIsHistoryLoading] = useState(true)
    const [connections, setConnections] = useState(null)
    const [isConnectionsLoading, setIsConnectionsLoading] = useState(true)
    const [unlinkingProvider, setUnlinkingProvider] = useState('')
    const currentLanguage = i18n.language === 'en' ? 'en' : 'ru'

    useEffect(() => {
        checkAuth({ silent: true })
    }, [checkAuth])

    const profile = useMemo(() => {
        const displayName = user?.username || user?.email?.split('@')[0] || t('accountSettings.common.playerFallback')

        return {
            name: displayName,
            email: user?.email || t('accountSettings.common.emailFallback'),
            avatarUrl: getAssetUrl(user?.avatar_url),
            country: t('accountSettings.common.country'),
            status: user?.status || 'active',
        }
    }, [t, user])

    useEffect(() => {
        setProfileForm({ username: profile.name })
        setNextEmail(user?.email || '')
    }, [profile.name, user?.email])

    useEffect(() => {
        if (!avatarFile) {
            setAvatarPreview('')
            return undefined
        }

        const previewUrl = URL.createObjectURL(avatarFile)
        setAvatarPreview(previewUrl)

        return () => URL.revokeObjectURL(previewUrl)
    }, [avatarFile])

    useEffect(() => {
        let ignore = false

        const loadHistory = async () => {
            setIsHistoryLoading(true)

            try {
                const response = await settingsAPI.getLoginHistory()

                if (!ignore) {
                    setLoginHistory(Array.isArray(response.history) ? response.history : [])
                }
            } catch (error) {
                if (!ignore) {
                    notify(error.message || t('accountSettings.notifications.historyLoadError'), 'error')
                }
            } finally {
                if (!ignore) {
                    setIsHistoryLoading(false)
                }
            }
        }

        loadHistory()

        return () => {
            ignore = true
        }
    }, [t])

    useEffect(() => {
        let ignore = false

        const loadConnections = async () => {
            setIsConnectionsLoading(true)

            try {
                const response = await settingsAPI.getConnections()

                if (!ignore) {
                    setConnections(response)
                }
            } catch (error) {
                if (!ignore) {
                    notify(error.message || t('accountSettings.notifications.connectionsLoadError'), 'error')
                }
            } finally {
                if (!ignore) {
                    setIsConnectionsLoading(false)
                }
            }
        }

        loadConnections()

        return () => {
            ignore = true
        }
    }, [t])

    const handleAvatarChange = (event) => {
        const file = event.target.files?.[0]

        if (!file) {
            return
        }

        if (!AVATAR_TYPES.includes(file.type)) {
            notify(t('accountSettings.notifications.unsupportedAvatar'), 'error')
            event.target.value = ''
            return
        }

        if (file.size > AVATAR_MAX_SIZE) {
            notify(t('accountSettings.notifications.avatarTooLarge'), 'error')
            event.target.value = ''
            return
        }

        setAvatarFile(file)
    }

    const handleProfileSave = async (event) => {
        event.preventDefault()
        setIsSavingProfile(true)

        try {
            let nextUser = null
            const nextUsername = profileForm.username.trim()

            if (nextUsername && nextUsername !== profile.name) {
                const response = await authenticationAPI.updateProfile({
                    username: nextUsername,
                })
                nextUser = response.user
            }

            if (avatarFile) {
                const response = await authenticationAPI.updateAvatar(avatarFile)
                nextUser = response.user
            }

            if (nextUser) {
                setUser(nextUser)
                notify(t('accountSettings.notifications.profileUpdated'), 'success')
            } else {
                notify(t('accountSettings.notifications.noChanges'), 'info')
            }

            setAvatarFile(null)
            if (avatarInputRef.current) {
                avatarInputRef.current.value = ''
            }
        } catch (error) {
            notify(error.message || t('accountSettings.notifications.profileSaveError'), 'error')
        } finally {
            setIsSavingProfile(false)
        }
    }

    const handleEmailChangeSubmit = async (event) => {
        event.preventDefault()
        setIsChangingEmail(true)

        try {
            const response = await settingsAPI.requestEmailChange({ email: nextEmail })

            setUser(null)
            notify(t('accountSettings.notifications.emailUpdated'), 'success')
            navigate(response.redirectTo || `/verify-email/${encodeURIComponent(response.email)}`, { replace: true })
        } catch (error) {
            notify(error.message || t('accountSettings.notifications.emailChangeError'), 'error')
        } finally {
            setIsChangingEmail(false)
        }
    }

    const handlePasswordFormChange = (field, value) => {
        setPasswordForm((currentValue) => ({
            ...currentValue,
            [field]: value,
        }))
    }

    const handlePasswordSave = async (event) => {
        event.preventDefault()
        setIsSavingPassword(true)

        try {
            const response = await authenticationAPI.updatePassword(passwordForm)

            if (response.user) {
                setUser(response.user)
            }

            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            })
            notify(t('accountSettings.notifications.passwordUpdated'), 'success')
        } catch (error) {
            notify(error.message || t('accountSettings.notifications.passwordUpdateError'), 'error')
        } finally {
            setIsSavingPassword(false)
        }
    }

    const handleLogout = async () => {
        await logout()
        navigate('/login', { replace: true })
    }

    const handleUnlinkConnection = async (provider) => {
        setUnlinkingProvider(provider)

        try {
            const response = await settingsAPI.unlinkConnection(provider)
            setConnections(response)
            notify(t('accountSettings.notifications.connectionRemoved'), 'success')
        } catch (error) {
            notify(error.message || t('accountSettings.notifications.connectionRemoveError'), 'error')
        } finally {
            setUnlinkingProvider('')
        }
    }

    return (
        <section className="section account-settings-page">
            <div className="container account-settings-container profile-layout-shell">
                <ProfileSideNav />

                <div className="account-settings-content profile-layout-content">
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

                    <div className="account-settings-tabs" role="tablist" aria-label={t('accountSettings.tabs.aria')}>
                        <button
                            type="button"
                            className={activeTab === 'general' ? 'is-active' : ''}
                            onClick={() => setActiveTab('general')}
                        >
                            <i className="fas fa-sliders"></i>
                            {t('accountSettings.tabs.general')}
                        </button>
                        <button
                            type="button"
                            className={activeTab === 'account' ? 'is-active' : ''}
                            onClick={() => setActiveTab('account')}
                        >
                            <i className="fas fa-user"></i>
                            {t('accountSettings.tabs.account')}
                        </button>
                        <button
                            type="button"
                            className={activeTab === 'security' ? 'is-active' : ''}
                            onClick={() => setActiveTab('security')}
                        >
                            <i className="fas fa-shield-alt"></i>
                            {t('accountSettings.tabs.security')}
                        </button>
                    </div>

                    {activeTab === 'general' && (
                        <section className="account-settings-panel">
                            <GlowEffect>
                                <div className="glow-effect account-general-settings">
                                    <div className="account-section-title">
                                        <i className="fas fa-palette"></i>
                                        {t('accountSettings.general.title')}
                                    </div>
                                    <div className="account-theme-toggle account-language-setting">
                                        <span>
                                            <strong>{t('accountSettings.general.languageTitle')}</strong>
                                            <small>{t('accountSettings.general.languageDescription')}</small>
                                        </span>
                                        <InterfaceLanguageSelect className="account-language-select" />
                                    </div>
                                    <button
                                        type="button"
                                        className="account-theme-toggle"
                                        aria-pressed={isDarkTheme}
                                        onClick={toggleTheme}
                                    >
                                        <span>
                                            <strong>{t('accountSettings.general.darkThemeTitle')}</strong>
                                            <small>{t('accountSettings.general.darkThemeDescription')}</small>
                                        </span>
                                        <AppSwitch checked={isDarkTheme} />
                                    </button>
                                    <button
                                        type="button"
                                        className="account-theme-toggle"
                                        aria-pressed={isGlowEffectEnabled}
                                        onClick={toggleGlowEffect}
                                    >
                                        <span>
                                            <strong>{t('accountSettings.general.glowTitle')}</strong>
                                            <small>{t('accountSettings.general.glowDescription')}</small>
                                        </span>
                                        <AppSwitch checked={isGlowEffectEnabled} />
                                    </button>
                                </div>
                            </GlowEffect>
                        </section>
                    )}

                    {activeTab === 'account' && (
                        <section className="account-settings-panel">
                            <GlowEffect>
                                <form className="glow-effect account-profile-form" onSubmit={handleProfileSave}>
                                    <div className="account-avatar-block">
                                        <div className="account-avatar">
                                            {avatarPreview || profile.avatarUrl ? (
                                                accountAvatarMedia(avatarPreview || profile.avatarUrl, profile.name)
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
                                            accept="image/png,image/jpeg,image/gif,image/webp,image/avif,video/webm"
                                            onChange={handleAvatarChange}
                                        />
                                    </div>

                                    <label className="account-field account-field--username">
                                        <span>{t('accountSettings.profile.nickname')}</span>
                                        <input
                                            type="text"
                                            value={profileForm.username}
                                            maxLength={32}
                                            onChange={(event) => setProfileForm({ username: event.target.value })}
                                        />
                                    </label>

                                    <button type="submit" className="button account-save-button" disabled={isSavingProfile}>
                                        <i className="fas fa-save"></i>
                                        {isSavingProfile ? t('accountSettings.common.saving') : t('accountSettings.common.save')}
                                    </button>

                                    <div className="account-info-grid">
                                        <InfoRow label={t('accountSettings.profile.email')} value={profile.email}>
                                            <button type="button" onClick={() => setIsEmailModalOpen(true)}>
                                                {t('accountSettings.common.change')}
                                            </button>
                                        </InfoRow>
                                        <InfoRow label={t('accountSettings.profile.country')} value={profile.country} />
                                        <InfoRow label={t('accountSettings.profile.status')} value={formatStatus(profile.status, t)} />
                                    </div>
                                </form>
                            </GlowEffect>
                        </section>
                    )}

                    {activeTab === 'security' && (
                        <section className="account-security-grid">
                            <GlowEffect className="account-login-methods-wrap">
                                <div className="glow-effect account-login-methods">
                                    <div className="account-section-title">
                                        <i className="fas fa-fingerprint"></i>
                                        {t('accountSettings.security.loginMethods')}
                                    </div>

                                    <div className="account-login-method-list">
                                        {isConnectionsLoading ? (
                                            <div className="account-empty-state">{t('accountSettings.security.loadingMethods')}</div>
                                        ) : (
                                            <>
                                                <article className="account-login-method">
                                                    <span className="account-login-method__icon">
                                                        <i className="fas fa-envelope"></i>
                                                    </span>
                                                    <div>
                                                        <strong>{t('accountSettings.security.emailPassword')}</strong>
                                                        <small>{connections?.hasPassword ? t('accountSettings.security.mainLogin') : t('accountSettings.security.passwordMissing')}</small>
                                                    </div>
                                                    <span className="account-login-method__badge">{t('accountSettings.security.cannotDelete')}</span>
                                                </article>

                                                {(connections?.providers || []).map((provider) => (
                                                    <article
                                                        key={provider.provider}
                                                        className={`account-login-method ${provider.isConnected ? 'is-connected' : ''}`}
                                                    >
                                                        <span className="account-login-method__icon">
                                                            <i className={getProviderIcon(provider.provider)}></i>
                                                        </span>
                                                        <div>
                                                            <strong>{provider.label}</strong>
                                                            <small>
                                                                {provider.isConnected
                                                                    ? t('accountSettings.security.connectedAt', { date: formatDateTime(provider.connectedAt, currentLanguage, t) })
                                                                    : t('accountSettings.security.notConnected')}
                                                            </small>
                                                        </div>
                                                        {provider.isConnected ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleUnlinkConnection(provider.provider)}
                                                                disabled={!provider.canUnlink || unlinkingProvider === provider.provider}
                                                            >
                                                                {unlinkingProvider === provider.provider ? t('accountSettings.security.deleting') : t('accountSettings.security.delete')}
                                                            </button>
                                                        ) : (
                                                            <span className="account-login-method__badge">{t('accountSettings.security.none')}</span>
                                                        )}
                                                    </article>
                                                ))}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </GlowEffect>

                            <GlowEffect>
                                <form className="glow-effect account-password-form" onSubmit={handlePasswordSave}>
                                    <div className="account-section-title">
                                        <i className="fas fa-key"></i>
                                        {t('accountSettings.security.passwordTitle')}
                                    </div>

                                    <label className="account-field">
                                        <span>{t('accountSettings.security.currentPassword')}</span>
                                        <input
                                            type="password"
                                            value={passwordForm.currentPassword}
                                            autoComplete="current-password"
                                            onChange={(event) => handlePasswordFormChange('currentPassword', event.target.value)}
                                            required
                                        />
                                    </label>
                                    <label className="account-field">
                                        <span>{t('accountSettings.security.newPassword')}</span>
                                        <input
                                            type="password"
                                            value={passwordForm.newPassword}
                                            autoComplete="new-password"
                                            onChange={(event) => handlePasswordFormChange('newPassword', event.target.value)}
                                            required
                                        />
                                    </label>
                                    <label className="account-field">
                                        <span>{t('accountSettings.security.confirmPassword')}</span>
                                        <input
                                            type="password"
                                            value={passwordForm.confirmPassword}
                                            autoComplete="new-password"
                                            onChange={(event) => handlePasswordFormChange('confirmPassword', event.target.value)}
                                            required
                                        />
                                    </label>

                                    <button type="submit" className="button account-save-button" disabled={isSavingPassword}>
                                        <i className="fas fa-save"></i>
                                        {isSavingPassword ? t('accountSettings.security.updating') : t('accountSettings.security.updatePassword')}
                                    </button>
                                </form>
                            </GlowEffect>

                            <GlowEffect>
                                <div className="glow-effect account-login-history">
                                    <div className="account-section-title">
                                        <i className="fas fa-clock-rotate-left"></i>
                                        {t('accountSettings.security.loginHistory')}
                                    </div>

                                    <div className="account-login-list">
                                        {isHistoryLoading ? (
                                            <div className="account-empty-state">{t('accountSettings.security.loadingHistory')}</div>
                                        ) : loginHistory.length > 0 ? (
                                            loginHistory.map((item) => (
                                                <article key={item.id} className="account-login-item">
                                                    <div>
                                                        <strong>{item.location}</strong>
                                                        <span>{item.device}</span>
                                                    </div>
                                                    <time>{formatDateTime(item.createdAt, currentLanguage, t)}</time>
                                                </article>
                                            ))
                                        ) : (
                                            <div className="account-empty-state">{t('accountSettings.security.emptyHistory')}</div>
                                        )}
                                    </div>

                                    <button type="button" className="button account-logout-button" onClick={handleLogout}>
                                        <i className="fas fa-sign-out-alt"></i>
                                        {t('accountSettings.security.logout')}
                                    </button>
                                </div>
                            </GlowEffect>
                        </section>
                    )}
                </div>
            </div>

            {isEmailModalOpen && (
                <div className="account-email-modal" role="dialog" aria-modal="true" aria-labelledby="account-email-title">
                    <form className="account-email-modal__panel" onSubmit={handleEmailChangeSubmit}>
                        <h2 id="account-email-title">{t('accountSettings.emailModal.title')}</h2>
                        <label className="account-field">
                            <span>{t('accountSettings.emailModal.newEmail')}</span>
                            <input
                                type="email"
                                value={nextEmail}
                                onChange={(event) => setNextEmail(event.target.value)}
                                autoFocus
                                required
                            />
                        </label>
                        <div className="account-email-modal__actions">
                            <button type="submit" className="button" disabled={isChangingEmail}>
                                {isChangingEmail ? t('accountSettings.emailModal.sending') : t('accountSettings.common.change')}
                            </button>
                            <button
                                type="button"
                                className="button account-email-modal__cancel"
                                onClick={() => setIsEmailModalOpen(false)}
                                disabled={isChangingEmail}
                            >
                                {t('accountSettings.common.cancel')}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </section>
    )
}

const InfoRow = ({ children, label, value }) => (
    <div className="account-info-row">
        <span>{label}</span>
        <strong>{value}</strong>
        {children}
    </div>
)

const getAssetUrl = (value) => {
    if (!value) {
        return ''
    }

    if (/^https?:\/\//i.test(value)) {
        return value
    }

    const baseUrl = import.meta.env.VITE_API_URL || (
        typeof window !== 'undefined' && window.location.hostname
            ? `http://${window.location.hostname}:8880`
            : 'http://127.0.0.1:8880'
    )

    return `${baseUrl}${value}`
}

const accountAvatarMedia = (src, alt) => {
    if (/\.(webm|mp4|mov|ogg|ogv|m4v)(?:[?#]|$)/i.test(src)) {
        return <video src={src} autoPlay loop muted playsInline aria-label={alt} />
    }

    return <img src={src} alt={alt} />
}

const getProviderIcon = (provider) => {
    const icons = {
        github: 'fab fa-github',
        google: 'fab fa-google',
        discord: 'fab fa-discord',
        steam: 'fab fa-steam',
        vk: 'fab fa-vk',
        yandex: 'fab fa-yandex',
    }

    return icons[provider] || 'fas fa-link'
}

const formatStatus = (status, t) => {
    if (status === 'active') return t('accountSettings.common.active')
    if (status === 'pending_verification') return t('accountSettings.common.pendingVerification')

    return status || t('accountSettings.common.active')
}

const formatDateTime = (value, language, t) => {
    if (!value) {
        return t('accountSettings.common.unknownTime')
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return t('accountSettings.common.unknownTime')
    }

    return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

export default AccountSettingsPage
