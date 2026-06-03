import GlowEffect from '@/shared/ui/GlowEffect'

import { formatDateTime, getProviderIcon } from '../../accountSettings.utils.js'
import './AccountSecuritySection.css'

const AccountSecuritySection = ({
    connections,
    currentLanguage,
    isConnectionsLoading,
    isHistoryLoading,
    isSavingPassword,
    loginHistory,
    onLogout,
    onPasswordFormChange,
    onPasswordSave,
    onUnlinkConnection,
    passwordForm,
    t,
    unlinkingProvider,
}) => (
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
                                <LoginMethod
                                    key={provider.provider}
                                    currentLanguage={currentLanguage}
                                    onUnlinkConnection={onUnlinkConnection}
                                    provider={provider}
                                    t={t}
                                    unlinkingProvider={unlinkingProvider}
                                />
                            ))}
                        </>
                    )}
                </div>
            </div>
        </GlowEffect>

        <GlowEffect>
            <form className="glow-effect account-password-form" onSubmit={onPasswordSave}>
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
                        onChange={(event) => onPasswordFormChange('currentPassword', event.target.value)}
                        required
                    />
                </label>
                <label className="account-field">
                    <span>{t('accountSettings.security.newPassword')}</span>
                    <input
                        type="password"
                        value={passwordForm.newPassword}
                        autoComplete="new-password"
                        onChange={(event) => onPasswordFormChange('newPassword', event.target.value)}
                        required
                    />
                </label>
                <label className="account-field">
                    <span>{t('accountSettings.security.confirmPassword')}</span>
                    <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        autoComplete="new-password"
                        onChange={(event) => onPasswordFormChange('confirmPassword', event.target.value)}
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

                <button type="button" className="button account-logout-button" onClick={onLogout}>
                    <i className="fas fa-sign-out-alt"></i>
                    {t('accountSettings.security.logout')}
                </button>
            </div>
        </GlowEffect>
    </section>
)

const LoginMethod = ({ currentLanguage, onUnlinkConnection, provider, t, unlinkingProvider }) => (
    <article className={`account-login-method ${provider.isConnected ? 'is-connected' : ''}`}>
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
                onClick={() => onUnlinkConnection(provider.provider)}
                disabled={!provider.canUnlink || unlinkingProvider === provider.provider}
            >
                {unlinkingProvider === provider.provider ? t('accountSettings.security.deleting') : t('accountSettings.security.delete')}
            </button>
        ) : (
            <span className="account-login-method__badge">{t('accountSettings.security.none')}</span>
        )}
    </article>
)

export default AccountSecuritySection
