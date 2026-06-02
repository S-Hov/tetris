import { useEffect } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@/i18n'
import SupportMainGridSection from '@/widgets/SupportMainGridSection'

import SupportHelp from './components/SupportHelp/SupportHelp.jsx'
import SupportHero from './components/SupportHero/SupportHero.jsx'

import './SupportPage.css'

const SupportPage = () => {
    const { lang } = useParams()
    const { i18n } = useTranslation()
    const isSupportedLanguage = SUPPORTED_LANGUAGES.includes(lang)
    const currentLanguage = isSupportedLanguage ? lang : DEFAULT_LANGUAGE

    useEffect(() => {
        if (i18n.language !== currentLanguage) {
            i18n.changeLanguage(currentLanguage)
        }
    }, [currentLanguage, i18n])

    if (!isSupportedLanguage) {
        return <Navigate to={`/${DEFAULT_LANGUAGE}/support`} replace />
    }

    return (
        <section className="section support-page">
            <div className="container support-container">
                <SupportHero />
                <SupportHelp />
                <SupportMainGridSection />
            </div>
        </section>
    )
}

export default SupportPage
