import { useEffect, useMemo, useState } from 'react'

import { settingsAPI } from '@/shared/api/settings'
import CustomSelect from '@/shared/ui/CustomSelect'
import notify from '@/utils/Notifications'

import './PrivacySettingsSection.css'

const SETTING_FIELDS = [
    { key: 'profileVisibility', icon: 'fas fa-id-card', translationKey: 'profile' },
    { key: 'friendRequestsVisibility', icon: 'fas fa-user-plus', translationKey: 'friendRequests' },
    { key: 'roomInvitesVisibility', icon: 'fas fa-door-open', translationKey: 'roomInvites' },
    { key: 'matchInvitesVisibility', icon: 'fas fa-gamepad', translationKey: 'matchInvites' },
    { key: 'messagesVisibility', icon: 'fas fa-message', translationKey: 'messages' },
    { key: 'clubInvitesVisibility', icon: 'fas fa-users', translationKey: 'clubInvites' },
]

const PrivacySettingsSection = ({ t }) => {
    const [settings, setSettings] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [savingFields, setSavingFields] = useState({})
    const visibilityOptions = useMemo(() => [
        {
            value: 'public',
            label: t('accountSettings.privacy.options.public'),
            description: t('accountSettings.privacy.options.publicDescription'),
        },
        {
            value: 'friends',
            label: t('accountSettings.privacy.options.friends'),
            description: t('accountSettings.privacy.options.friendsDescription'),
        },
        {
            value: 'private',
            label: t('accountSettings.privacy.options.private'),
            description: t('accountSettings.privacy.options.privateDescription'),
        },
    ], [t])

    useEffect(() => {
        const controller = new AbortController()

        const loadSettings = async () => {
            setIsLoading(true)

            try {
                const response = await settingsAPI.getPrivacySettings({
                    signal: controller.signal,
                })
                setSettings(response.settings)
            } catch (error) {
                if (error?.name !== 'AbortError') {
                    notify(error.message || t('accountSettings.notifications.privacyLoadError'), 'error')
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false)
                }
            }
        }

        loadSettings()

        return () => controller.abort()
    }, [t])

    const handleSettingChange = async (field, nextValue) => {
        if (!settings || settings[field] === nextValue || savingFields[field]) {
            return
        }

        const previousValue = settings[field]
        setSettings((current) => ({ ...current, [field]: nextValue }))
        setSavingFields((current) => ({ ...current, [field]: true }))

        try {
            const response = await settingsAPI.updatePrivacySettings({
                [field]: nextValue,
            })
            setSettings((current) => ({
                ...current,
                [field]: response.settings[field],
            }))
            notify(t('accountSettings.notifications.privacyUpdated'), 'success')
        } catch (error) {
            setSettings((current) => ({ ...current, [field]: previousValue }))
            notify(error.message || t('accountSettings.notifications.privacyUpdateError'), 'error')
        } finally {
            setSavingFields((current) => {
                const next = { ...current }
                delete next[field]
                return next
            })
        }
    }

    return (
        <section className="account-settings-panel privacy-settings">
            <header className="privacy-settings__header">
                <div>
                    <h2 className="account-section-title">
                        <i className="fas fa-user-shield"></i>
                        {t('accountSettings.privacy.title')}
                    </h2>
                    <p>{t('accountSettings.privacy.description')}</p>
                </div>
            </header>

            {isLoading ? (
                <div className="privacy-settings__loading">
                    <i className="fas fa-circle-notch fa-spin"></i>
                    {t('accountSettings.privacy.loading')}
                </div>
            ) : settings ? (
                <div className="privacy-settings__grid">
                    {SETTING_FIELDS.map((field) => (
                        <article className="privacy-settings__item" key={field.key}>
                            <span className="privacy-settings__icon" aria-hidden="true">
                                <i className={field.icon}></i>
                            </span>
                            <div className="privacy-settings__copy">
                                <strong>{t(`accountSettings.privacy.fields.${field.translationKey}.title`)}</strong>
                                <p>{t(`accountSettings.privacy.fields.${field.translationKey}.description`)}</p>
                            </div>
                            <div className="privacy-settings__control">
                                <CustomSelect
                                    value={settings[field.key]}
                                    options={visibilityOptions}
                                    disabled={Boolean(savingFields[field.key])}
                                    onChange={(value) => handleSettingChange(field.key, value)}
                                />
                                <small className={savingFields[field.key] ? 'is-saving' : ''}>
                                    {savingFields[field.key]
                                        ? t('accountSettings.privacy.saving')
                                        : t('accountSettings.privacy.saved')}
                                </small>
                            </div>
                        </article>
                    ))}
                </div>
            ) : (
                <div className="privacy-settings__loading">
                    {t('accountSettings.privacy.loadError')}
                </div>
            )}
        </section>
    )
}

export default PrivacySettingsSection
