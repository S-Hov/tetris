import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import GlowEffect from '@/shared/ui/GlowEffect'
import AppSwitch from '@/shared/ui/AppSwitch'
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

    useEffect(() => {
        checkAuth({ silent: true })
    }, [checkAuth])

    const profile = useMemo(() => {
        const displayName = user?.username || user?.email?.split('@')[0] || 'Игрок'

        return {
            name: displayName,
            email: user?.email || 'Почта не указана',
            avatarUrl: getAssetUrl(user?.avatar_url),
            country: 'Россия',
            status: user?.status || 'active',
        }
    }, [user])

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
                    notify(error.message || 'Не удалось загрузить историю входов', 'error')
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
    }, [])

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
                    notify(error.message || 'Не удалось загрузить способы входа', 'error')
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
    }, [])

    const handleAvatarChange = (event) => {
        const file = event.target.files?.[0]

        if (!file) {
            return
        }

        if (!AVATAR_TYPES.includes(file.type)) {
            notify('Поддерживаются PNG, JPG, GIF, WEBP, AVIF и WEBM', 'error')
            event.target.value = ''
            return
        }

        if (file.size > AVATAR_MAX_SIZE) {
            notify('Аватарка не должна быть больше 2 МБ', 'error')
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
                notify('Профиль обновлён', 'success')
            } else {
                notify('Нет изменений для сохранения', 'info')
            }

            setAvatarFile(null)
            if (avatarInputRef.current) {
                avatarInputRef.current.value = ''
            }
        } catch (error) {
            notify(error.message || 'Не удалось сохранить профиль', 'error')
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
            notify('Почта обновлена. Введите код подтверждения', 'success')
            navigate(response.redirectTo || `/verify-email/${encodeURIComponent(response.email)}`, { replace: true })
        } catch (error) {
            notify(error.message || 'Не удалось изменить почту', 'error')
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
            notify('Пароль обновлён', 'success')
        } catch (error) {
            notify(error.message || 'Не удалось обновить пароль', 'error')
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
            notify('Способ входа удалён', 'success')
        } catch (error) {
            notify(error.message || 'Не удалось удалить способ входа', 'error')
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
                            <p className="account-settings-eyebrow">Личный кабинет</p>
                            <h1>Настройки аккаунта</h1>
                        </div>
                        <Link to="/profile" className="button account-settings-back">
                            <i className="fas fa-arrow-left"></i>
                            Профиль
                        </Link>
                    </div>

                    <div className="account-settings-tabs" role="tablist" aria-label="Разделы настроек">
                    <button
                        type="button"
                        className={activeTab === 'general' ? 'is-active' : ''}
                        onClick={() => setActiveTab('general')}
                    >
                        <i className="fas fa-sliders"></i>
                        Общие
                    </button>
                    <button
                        type="button"
                        className={activeTab === 'account' ? 'is-active' : ''}
                        onClick={() => setActiveTab('account')}
                    >
                        <i className="fas fa-user"></i>
                        Аккаунт
                    </button>
                    <button
                        type="button"
                        className={activeTab === 'security' ? 'is-active' : ''}
                        onClick={() => setActiveTab('security')}
                    >
                        <i className="fas fa-shield-alt"></i>
                        Безопасность
                    </button>
                    </div>

                    {activeTab === 'general' && (
                    <section className="account-settings-panel">
                        <GlowEffect>
                            <div className="glow-effect account-general-settings">
                                <div className="account-section-title">
                                    <i className="fas fa-palette"></i>
                                    Оформление
                                </div>

                                <button
                                    type="button"
                                    className="account-theme-toggle"
                                    aria-pressed={isDarkTheme}
                                    onClick={toggleTheme}
                                >
                                    <span>
                                        <strong>Тёмная тема</strong>
                                        <small>Переключает цветовую схему интерфейса</small>
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
                                        <strong>Glow Effect</strong>
                                        <small>Включает и выключает свечение карточек при движении курсора</small>
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
                                        aria-label="Выбрать новую аватарку"
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
                                    <span>Никнейм</span>
                                    <input
                                        type="text"
                                        value={profileForm.username}
                                        maxLength={32}
                                        onChange={(event) => setProfileForm({ username: event.target.value })}
                                    />
                                </label>

                                <button type="submit" className="button account-save-button" disabled={isSavingProfile}>
                                    <i className="fas fa-save"></i>
                                    {isSavingProfile ? 'Сохраняем...' : 'Сохранить'}
                                </button>

                                <div className="account-info-grid">
                                    <InfoRow label="Почта" value={profile.email}>
                                        <button type="button" onClick={() => setIsEmailModalOpen(true)}>
                                            Изменить
                                        </button>
                                    </InfoRow>
                                    <InfoRow label="Страна" value={profile.country} />
                                    <InfoRow label="Статус" value={formatStatus(profile.status)} />
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
                                    Способы входа
                                </div>

                                <div className="account-login-method-list">
                                    {isConnectionsLoading ? (
                                        <div className="account-empty-state">Загружаем способы входа...</div>
                                    ) : (
                                        <>
                                            <article className="account-login-method">
                                                <span className="account-login-method__icon">
                                                    <i className="fas fa-envelope"></i>
                                                </span>
                                                <div>
                                                    <strong>Почта и пароль</strong>
                                                    <small>{connections?.hasPassword ? 'Основной способ входа' : 'Пароль ещё не установлен'}</small>
                                                </div>
                                                <span className="account-login-method__badge">Нельзя удалить</span>
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
                                                                ? `Подключён ${formatDateTime(provider.connectedAt)}`
                                                                : 'Не подключён'}
                                                        </small>
                                                    </div>
                                                    {provider.isConnected ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUnlinkConnection(provider.provider)}
                                                            disabled={!provider.canUnlink || unlinkingProvider === provider.provider}
                                                        >
                                                            {unlinkingProvider === provider.provider ? 'Удаляем...' : 'Удалить'}
                                                        </button>
                                                    ) : (
                                                        <span className="account-login-method__badge">Нет</span>
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
                                    Изменение пароля
                                </div>

                                <label className="account-field">
                                    <span>Текущий пароль</span>
                                    <input
                                        type="password"
                                        value={passwordForm.currentPassword}
                                        autoComplete="current-password"
                                        onChange={(event) => handlePasswordFormChange('currentPassword', event.target.value)}
                                        required
                                    />
                                </label>
                                <label className="account-field">
                                    <span>Новый пароль</span>
                                    <input
                                        type="password"
                                        value={passwordForm.newPassword}
                                        autoComplete="new-password"
                                        onChange={(event) => handlePasswordFormChange('newPassword', event.target.value)}
                                        required
                                    />
                                </label>
                                <label className="account-field">
                                    <span>Подтверждение нового пароля</span>
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
                                    {isSavingPassword ? 'Обновляем...' : 'Обновить пароль'}
                                </button>
                            </form>
                        </GlowEffect>

                        <GlowEffect>
                            <div className="glow-effect account-login-history">
                                <div className="account-section-title">
                                    <i className="fas fa-clock-rotate-left"></i>
                                    История входа
                                </div>

                                <div className="account-login-list">
                                    {isHistoryLoading ? (
                                        <div className="account-empty-state">Загружаем историю...</div>
                                    ) : loginHistory.length > 0 ? (
                                        loginHistory.map((item) => (
                                            <article key={item.id} className="account-login-item">
                                                <div>
                                                    <strong>{item.location}</strong>
                                                    <span>{item.device}</span>
                                                </div>
                                                <time>{formatDateTime(item.createdAt)}</time>
                                            </article>
                                        ))
                                    ) : (
                                        <div className="account-empty-state">История входов пока пуста</div>
                                    )}
                                </div>

                                <button type="button" className="button account-logout-button" onClick={handleLogout}>
                                    <i className="fas fa-sign-out-alt"></i>
                                    Выйти из аккаунта
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
                        <h2 id="account-email-title">Изменить почту</h2>
                        <label className="account-field">
                            <span>Новая почта</span>
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
                                {isChangingEmail ? 'Отправляем...' : 'Изменить'}
                            </button>
                            <button
                                type="button"
                                className="button account-email-modal__cancel"
                                onClick={() => setIsEmailModalOpen(false)}
                                disabled={isChangingEmail}
                            >
                                Отмена
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

const formatStatus = (status) => {
    if (status === 'active') return 'Активен'
    if (status === 'pending_verification') return 'Ожидает подтверждения'

    return status || 'Активен'
}

const formatDateTime = (value) => {
    if (!value) {
        return 'Время не определено'
    }

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) {
        return 'Время не определено'
    }

    return new Intl.DateTimeFormat('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date)
}

export default AccountSettingsPage
