import AuthForm from "@/features/AuthForm/AuthForm"
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

const RegisterPage = () => {
    const { t, i18n } = useTranslation()
    const currentLanguage = i18n.language === 'en' ? 'en' : 'ru'

    return (
        <section className="section register-section auth-section">
            <Helmet htmlAttributes={{ lang: currentLanguage }}>
                <title>{t('auth.seo.registerTitle')}</title>
                <meta name="description" content={t('auth.seo.registerDescription')} />
            </Helmet>
            <AuthForm type="register" />
        </section>
    )
}

export default RegisterPage
