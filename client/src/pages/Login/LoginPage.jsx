import AuthForm from "@/features/AuthForm/AuthForm"
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

const LoginPage = () => {
    const { t, i18n } = useTranslation()
    const currentLanguage = i18n.language === 'en' ? 'en' : 'ru'

    return (
        <section className="section login-section auth-section">
            <Helmet htmlAttributes={{ lang: currentLanguage }}>
                <title>{t('auth.seo.loginTitle')}</title>
                <meta name="description" content={t('auth.seo.loginDescription')} />
            </Helmet>
            <AuthForm type="login" />
        </section>
    )
}

export default LoginPage
