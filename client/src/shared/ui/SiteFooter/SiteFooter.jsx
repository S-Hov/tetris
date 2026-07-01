import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { getLocalizedPath } from '@/i18n'
import './SiteFooter.css'

const footerLinks = [
    { to: '/', labelKey: 'siteFooter.links.home' },
    { to: '/about', labelKey: 'siteFooter.links.about' },
    { to: '/support', labelKey: 'siteFooter.links.support' },
    { to: '/rating', labelKey: 'siteFooter.links.rating' },
    { to: '/profile', labelKey: 'siteFooter.links.profile' },
]

const legalLinks = [
    { to: '/docs/cookie', labelKey: 'siteFooter.legal.cookie' },
    { to: '/docs/terms', labelKey: 'siteFooter.legal.terms' },
    { to: '/docs/privacy', labelKey: 'siteFooter.legal.privacy' },
]

const SiteFooter = () => {
    const { t, i18n } = useTranslation()
    const currentLanguage = i18n.language === 'en' ? 'en' : 'ru'

    return (
        <footer className="site-footer">
            <div className="container site-footer__container">
                <div className="site-footer__brand">
                    <strong>PVP Tetris</strong>
                    <span>{t('siteFooter.tagline')}</span>
                </div>

                <nav className="site-footer__nav" aria-label={t('siteFooter.navAriaLabel')}>
                    {footerLinks.map((link) => (
                        <Link key={link.to} to={getLocalizedPath(link.to, currentLanguage)}>
                            {t(link.labelKey)}
                        </Link>
                    ))}
                </nav>

                <nav className="site-footer__legal" aria-label={t('siteFooter.legalAriaLabel')}>
                    {legalLinks.map((link) => (
                        <Link key={link.to} to={getLocalizedPath(link.to, currentLanguage)}>
                            {t(link.labelKey)}
                        </Link>
                    ))}
                </nav>

                <Link to={getLocalizedPath('/about#donate', currentLanguage)} className="site-footer__donate">
                    <i className="fas fa-wallet"></i>
                    {t('siteFooter.donate')}
                </Link>
            </div>
        </footer>
    )
}

export default SiteFooter
