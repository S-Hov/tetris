import { Link } from "react-router-dom"
import { useTranslation } from 'react-i18next'
import { getLocalizedPath } from '@/i18n'

const AuthRedirect = ({ type }) => {
    const { t } = useTranslation()

    return type === 'login'
        ? (
            <div className="form-redirect">
                {t('auth.redirect.noAccount')} <Link to={getLocalizedPath('/register')} className="link" id="registerRedirect">{t('auth.redirect.create')} <i className="fa-solid fa-arrow-right-long"></i></Link>
            </div>
        )
        : (
            <div className="form-redirect">
                {t('auth.redirect.hasAccount')} <Link to={getLocalizedPath('/login')} className="link" id="loginRedirect">{t('auth.redirect.login')} <i className="fa-solid fa-arrow-right-long"></i></Link>
            </div>
        )
}

export default AuthRedirect
