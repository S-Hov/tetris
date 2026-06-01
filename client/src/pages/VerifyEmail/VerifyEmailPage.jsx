import EmailVerification from "@/features/EmailVerification/EmailVerification"
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

const VerifyEmailPage = () => {
    const { t, i18n } = useTranslation()
    const currentLanguage = i18n.language === 'en' ? 'en' : 'ru'

    return (
        <section className="section verify-section auth-section">
            <Helmet htmlAttributes={{ lang: currentLanguage }}>
                <title>{t('emailVerification.seo.title')}</title>
                <meta name="description" content={t('emailVerification.seo.description')} />
            </Helmet>
            <EmailVerification />
        </section>
    )
}

export default VerifyEmailPage
