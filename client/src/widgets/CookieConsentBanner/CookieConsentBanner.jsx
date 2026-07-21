import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { getLocalizedPath } from '@/i18n'
import { trackPageView } from '@/shared/api/analytics'
import { acceptCookieConsent, hasCookieConsent } from '@/shared/lib/cookieConsent.js'
import CookieConsentControls from '@/shared/ui/CookieConsentControls'

import './CookieConsentBanner.css'

const CookieConsentBanner = () => {
    const { t, i18n } = useTranslation()
    const [isVisible, setIsVisible] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const currentLanguage = i18n.language === 'en' ? 'en' : 'ru'

    useEffect(() => {
        setIsVisible(!hasCookieConsent())
    }, [])

    const handleAccept = () => {
        acceptCookieConsent()
        trackPageView()
        setIsVisible(false)
    }

    const handleChoice = () => {
        setIsVisible(false)
    }

    if (!isVisible) {
        return null
    }

    return (
        <aside className="cookie-consent-banner" aria-label={t('cookieConsentBanner.ariaLabel')}>
            <div className="cookie-consent-banner__body">
                <div className="cookie-consent-banner__content">
                    <span className="cookie-consent-banner__icon" aria-hidden="true">
                        <i className="fa-solid fa-cookie-bite"></i>
                    </span>
                    <div className="cookie-consent-banner__text">
                        <strong>{t('cookieConsentBanner.title')}</strong>
                        <p>
                            {t('cookieConsentBanner.description')}{' '}
                            <Link to={getLocalizedPath('/docs/cookie', currentLanguage)}>
                                {t('cookieConsentBanner.link')}
                            </Link>
                        </p>
                    </div>
                </div>

                {isSettingsOpen && (
                    <CookieConsentControls
                        className="cookie-consent-banner__settings"
                        onChoice={handleChoice}
                    />
                )}
            </div>

            <div className="cookie-consent-banner__actions">
                <button
                    type="button"
                    className="cookie-consent-banner__settings-button"
                    aria-expanded={isSettingsOpen}
                    onClick={() => setIsSettingsOpen((value) => !value)}
                >
                    {t('cookieConsentBanner.settings')}
                </button>
                <button type="button" className="cookie-consent-banner__accept" onClick={handleAccept}>
                    {t('cookieConsentBanner.acceptAll')}
                </button>
            </div>
        </aside>
    )
}

export default CookieConsentBanner
