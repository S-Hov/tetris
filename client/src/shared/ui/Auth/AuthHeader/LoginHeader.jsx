import './AuthHeader.css'
import { useTranslation } from 'react-i18next'

const LoginFormHeader = () => {
    const { t } = useTranslation()

    return (
        <div className="form-header">
            <div className="glow-icon">
                <i className="fas fa-fingerprint"></i>
            </div>
            <h2>{t('auth.login.title')}</h2>
            <p>{t('auth.login.subtitle')}</p>
        </div>
    )
}

export default LoginFormHeader
