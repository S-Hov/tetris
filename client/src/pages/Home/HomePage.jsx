import { useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/i18n'
import ArenaDashboardSection from '@/widgets/ArenaDashboardSection'
import GameModesSection from '@/widgets/GameModesSection'
import SupportProjectSection from '@/widgets/SupportProjectSection'

import HomeHero from './components/HomeHero/HomeHero.jsx'
import { SITE_URL } from './homePage.config.js'

import './HomePage.css'

const HomePage = () => {
    const { lang } = useParams()
    const { t, i18n } = useTranslation()
    const isSupportedLanguage = SUPPORTED_LANGUAGES.includes(lang)
    const currentLanguage = isSupportedLanguage ? lang : DEFAULT_LANGUAGE

    useEffect(() => {
        if (i18n.language !== currentLanguage) {
            i18n.changeLanguage(currentLanguage)
        }
    }, [currentLanguage, i18n])

    if (!isSupportedLanguage) {
        return <Navigate to={`/${DEFAULT_LANGUAGE}`} replace />
    }

    return (
        <section className="section home-page">
            <Helmet htmlAttributes={{ lang: currentLanguage }}>
                <title>{t('seo.title')}</title>
                <meta name="description" content={t('seo.description')} />
                <meta property="og:title" content={t('seo.ogTitle')} />
                <meta property="og:description" content={t('seo.ogDescription')} />
                <meta property="og:type" content="website" />
                <link rel="canonical" href={`${SITE_URL}/${currentLanguage}`} />
                <link rel="alternate" hrefLang="ru" href={`${SITE_URL}/ru`} />
                <link rel="alternate" hrefLang="en" href={`${SITE_URL}/en`} />
                <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/ru`} />
            </Helmet>

            <div className="container home-container">
                <HomeHero />
                <GameModesSection />
                <ArenaDashboardSection currentLanguage={currentLanguage} />
                <SupportProjectSection currentLanguage={currentLanguage} />
            </div>
        </section>
    )
}

export default HomePage
