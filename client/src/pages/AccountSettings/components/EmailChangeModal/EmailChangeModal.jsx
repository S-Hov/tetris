import './EmailChangeModal.css'

const EmailChangeModal = ({
    isChangingEmail,
    nextEmail,
    onClose,
    onEmailChange,
    onSubmit,
    t,
}) => (
    <div className="account-email-modal" role="dialog" aria-modal="true" aria-labelledby="account-email-title">
        <form className="account-email-modal__panel" onSubmit={onSubmit}>
            <h2 id="account-email-title">{t('accountSettings.emailModal.title')}</h2>
            <label className="account-field">
                <span>{t('accountSettings.emailModal.newEmail')}</span>
                <input
                    type="email"
                    value={nextEmail}
                    onChange={(event) => onEmailChange(event.target.value)}
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
                    onClick={onClose}
                    disabled={isChangingEmail}
                >
                    {t('accountSettings.common.cancel')}
                </button>
            </div>
        </form>
    </div>
)

export default EmailChangeModal
