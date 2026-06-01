import './AuthHeader.css'
import { useTranslation } from 'react-i18next'

const RegisterFormHeader = () => {
    const { t } = useTranslation()

    return (
        <div className="form-header">
            <div className="glow-icon glow-text">
                <i className="fas fa-user-plus"></i>
            </div>
            <h2 className='glow-text'>{t('auth.register.title')}</h2>
            <p>{t('auth.register.subtitle')}</p>
        </div>
    )
}

export default RegisterFormHeader
