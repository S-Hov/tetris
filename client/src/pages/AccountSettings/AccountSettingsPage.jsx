import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import ProfileSideNav from '@/widgets/ProfileSideNav'
import { useAuth } from '@/shared/hooks/useAuth'
import { useGlowEffect } from '@/shared/hooks/useGlowEffect.js'
import { useInterfaceRadius } from '@/shared/hooks/useInterfaceRadius.js'
import { useTheme } from '@/shared/hooks/useTheme.js'
import { authenticationAPI } from '@/shared/api/auth'
import { settingsAPI } from '@/shared/api/settings'
import notify from '@/utils/Notifications'

import AccountProfileSection from './components/AccountProfileSection/AccountProfileSection.jsx'
import AccountSecuritySection from './components/AccountSecuritySection/AccountSecuritySection.jsx'
import AccountSettingsHeader from './components/AccountSettingsHeader/AccountSettingsHeader.jsx'
import AccountSettingsTabs from './components/AccountSettingsTabs/AccountSettingsTabs.jsx'
import EmailChangeModal from './components/EmailChangeModal/EmailChangeModal.jsx'
import GeneralSettingsSection from './components/GeneralSettingsSection/GeneralSettingsSection.jsx'
import {
    ACCOUNT_SETTINGS_SECTION_KEYS,
    AVATAR_MAX_SIZE,
    AVATAR_TYPES,
    DEFAULT_ACCOUNT_SETTINGS_SECTION,
} from './accountSettingsPage.config.js'
import { buildAccountProfile } from './accountSettings.utils.js'

import './AccountSettingsPage.css'

const AccountSettingsPage = () => {
    const { section } = useParams()
    const navigate = useNavigate()
    const { t, i18n } = useTranslation()
    const avatarInputRef = useRef(null)
    const { checkAuth, logout, setUser, user } = useAuth()
    const { isGlowEffectEnabled, toggleGlowEffect } = useGlowEffect()
    const { radiusSettings, setRadiusSetting } = useInterfaceRadius()
    const { isDarkTheme, toggleTheme } = useTheme()
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
    const [isHistoryLoading, setIsHistoryLoading] = useState(false)
    const [connections, setConnections] = useState(null)
    const [isConnectionsLoading, setIsConnectionsLoading] = useState(false)
    const [unlinkingProvider, setUnlinkingProvider] = useState('')
    const currentLanguage = i18n.language === 'en' ? 'en' : 'ru'
    const activeSection = section || DEFAULT_ACCOUNT_SETTINGS_SECTION
    const isKnownSection = ACCOUNT_SETTINGS_SECTION_KEYS.includes(activeSection)

    useEffect(() => {
        checkAuth({ silent: true })
    }, [checkAuth])

    const profile = useMemo(() => buildAccountProfile({ t, user }), [t, user])

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
        if (activeSection !== 'security') {
            return undefined
        }

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
    }, [activeSection, t])

    useEffect(() => {
        if (activeSection !== 'security') {
            return undefined
        }

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
    }, [activeSection, t])

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

    if (!section) {
        return <Navigate to={`/account-settings/${DEFAULT_ACCOUNT_SETTINGS_SECTION}`} replace />
    }

    if (!isKnownSection) {
        return <Navigate to={`/account-settings/${DEFAULT_ACCOUNT_SETTINGS_SECTION}`} replace />
    }

    return (
        <section className="section account-settings-page">
            <div className="container account-settings-container profile-layout-shell">
                <ProfileSideNav />

                <div className="account-settings-content profile-layout-content">
                    <AccountSettingsHeader t={t} />
                    <AccountSettingsTabs t={t} />

                    {activeSection === 'general' && (
                        <GeneralSettingsSection
                            isDarkTheme={isDarkTheme}
                            isGlowEffectEnabled={isGlowEffectEnabled}
                            onGlowEffectToggle={toggleGlowEffect}
                            onRadiusSettingChange={setRadiusSetting}
                            onThemeToggle={toggleTheme}
                            radiusSettings={radiusSettings}
                            t={t}
                        />
                    )}

                    {activeSection === 'account' && (
                        <AccountProfileSection
                            avatarInputRef={avatarInputRef}
                            avatarPreview={avatarPreview}
                            isSavingProfile={isSavingProfile}
                            onAvatarChange={handleAvatarChange}
                            onEmailModalOpen={() => setIsEmailModalOpen(true)}
                            onProfileFormChange={setProfileForm}
                            onProfileSave={handleProfileSave}
                            profile={profile}
                            profileForm={profileForm}
                            t={t}
                        />
                    )}

                    {activeSection === 'security' && (
                        <AccountSecuritySection
                            connections={connections}
                            currentLanguage={currentLanguage}
                            isConnectionsLoading={isConnectionsLoading}
                            isHistoryLoading={isHistoryLoading}
                            isSavingPassword={isSavingPassword}
                            loginHistory={loginHistory}
                            onLogout={handleLogout}
                            onPasswordFormChange={handlePasswordFormChange}
                            onPasswordSave={handlePasswordSave}
                            onUnlinkConnection={handleUnlinkConnection}
                            passwordForm={passwordForm}
                            t={t}
                            unlinkingProvider={unlinkingProvider}
                        />
                    )}
                </div>
            </div>

            {isEmailModalOpen && (
                <EmailChangeModal
                    isChangingEmail={isChangingEmail}
                    nextEmail={nextEmail}
                    onClose={() => setIsEmailModalOpen(false)}
                    onEmailChange={setNextEmail}
                    onSubmit={handleEmailChangeSubmit}
                    t={t}
                />
            )}
        </section>
    )
}

export default AccountSettingsPage
