import { useEffect } from 'react'
import { Navigate, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/i18n'

import AboutFeatures from './components/AboutFeatures/AboutFeatures.jsx'
import AboutHero from './components/AboutHero/AboutHero.jsx'
import AboutSeasons from './components/AboutSeasons/AboutSeasons.jsx'
import AboutStats from './components/AboutStats/AboutStats.jsx'
import AboutSupportSection from './components/AboutSupportSection/AboutSupportSection.jsx'

import './AboutPage.css'

const AboutPage = () => {
    const location = useLocation()
    const { lang } = useParams()
    const { i18n } = useTranslation()
    const isSupportedLanguage = SUPPORTED_LANGUAGES.includes(lang)
    const currentLanguage = isSupportedLanguage ? lang : DEFAULT_LANGUAGE

    useEffect(() => {
        if (!location.hash) {
            return
        }

        const target = document.querySelector(location.hash)
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, [location.hash])

    useEffect(() => {
        if (i18n.language !== currentLanguage) {
            i18n.changeLanguage(currentLanguage)
        }
    }, [currentLanguage, i18n])

    if (!isSupportedLanguage) {
        return <Navigate to={`/${DEFAULT_LANGUAGE}/about`} replace />
    }

    return (
        <section className="section about-page">
            <div className="container about-container">
                <AboutHero currentLanguage={currentLanguage} />
                <AboutFeatures />
                <AboutSeasons />
                <AboutStats />
                <AboutSupportSection currentLanguage={currentLanguage} />
            </div>
        </section>
    )
}

export default AboutPage
