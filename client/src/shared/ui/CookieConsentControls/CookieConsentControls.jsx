import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { trackPageView } from '@/shared/api/analytics'
import {
    acceptCookieConsent,
    acceptNecessaryCookieConsent,
    COOKIE_CONSENT_CHANGED_EVENT,
    COOKIE_CONSENT_MODES,
    getCookieConsent,
} from '@/shared/lib/cookieConsent.js'

import './CookieConsentControls.css'

const CookieConsentControls = ({ className = '', onChoice }) => {
    const { t } = useTranslation()
    const [consent, setConsent] = useState(() => getCookieConsent())

    useEffect(() => {
        const handleConsentChanged = () => {
            setConsent(getCookieConsent())
        }

        window.addEventListener(COOKIE_CONSENT_CHANGED_EVENT, handleConsentChanged)

        return () => {
            window.removeEventListener(COOKIE_CONSENT_CHANGED_EVENT, handleConsentChanged)
        }
    }, [])

    const handleAcceptAll = () => {
        const nextConsent = acceptCookieConsent()

        setConsent(nextConsent)
        trackPageView()
        onChoice?.(nextConsent)
    }

    const handleAcceptNecessary = () => {
        const nextConsent = acceptNecessaryCookieConsent()

        setConsent(nextConsent)
        onChoice?.(nextConsent)
    }

    const currentMode = consent?.mode || null

    return (
        <div className={`cookie-consent-controls ${className}`}>
            <div className="cookie-consent-controls__status" role="status">
                <span>{t('cookieConsentControls.statusLabel')}</span>
                <strong>
                    {currentMode === COOKIE_CONSENT_MODES.ALL
                        ? t('cookieConsentControls.statusAll')
                        : currentMode === COOKIE_CONSENT_MODES.NECESSARY
                            ? t('cookieConsentControls.statusNecessary')
                            : t('cookieConsentControls.statusUnset')}
                </strong>
            </div>

            <div className="cookie-consent-controls__choices">
                <article className={currentMode === COOKIE_CONSENT_MODES.NECESSARY ? 'is-active' : ''}>
                    <span aria-hidden="true"><i className="fas fa-lock"></i></span>
                    <div>
                        <strong>{t('cookieConsentControls.necessaryTitle')}</strong>
                        <p>{t('cookieConsentControls.necessaryDescription')}</p>
                    </div>
                    <button type="button" onClick={handleAcceptNecessary}>
                        {t('cookieConsentControls.necessaryButton')}
                    </button>
                </article>

                <article className={currentMode === COOKIE_CONSENT_MODES.ALL ? 'is-active' : ''}>
                    <span aria-hidden="true"><i className="fas fa-chart-line"></i></span>
                    <div>
                        <strong>{t('cookieConsentControls.allTitle')}</strong>
                        <p>{t('cookieConsentControls.allDescription')}</p>
                    </div>
                    <button type="button" onClick={handleAcceptAll}>
                        {t('cookieConsentControls.allButton')}
                    </button>
                </article>
            </div>
        </div>
    )
}

export default CookieConsentControls
