import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { getLocalizedPath } from '@/i18n'
import { trackPageView } from '@/shared/api/analytics'
import { acceptCookieConsent, hasCookieConsent } from '@/shared/lib/cookieConsent.js'

import './CookieConsentBanner.css'

const CookieConsentBanner = () => {
    const { t, i18n } = useTranslation()
    const [isVisible, setIsVisible] = useState(false)
    const currentLanguage = i18n.language === 'en' ? 'en' : 'ru'

    useEffect(() => {
        setIsVisible(!hasCookieConsent())
    }, [])

    const handleAccept = () => {
        acceptCookieConsent()
        setIsVisible(false)
        trackPageView()
    }

    if (!isVisible) {
        return null
    }

    return (
        <aside className="cookie-consent-banner" aria-label={t('cookieConsentBanner.ariaLabel')}>
            <div className="cookie-consent-banner__content">
                <span className="cookie-consent-banner__icon" aria-hidden="true">
                    <i className="fas fa-shield-alt"></i>
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

            <button type="button" className="cookie-consent-banner__accept" onClick={handleAccept}>
                {t('cookieConsentBanner.accept')}
            </button>
        </aside>
    )
}

export default CookieConsentBanner
