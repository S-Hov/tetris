import { useTranslation } from 'react-i18next'

import GlowEffect from '@/shared/ui/GlowEffect'

import supportBanner from '@/shared/assets/support/support-banner.png'

import './SupportHero.css'

const SupportHero = () => {
    const { t } = useTranslation()

    return (
        <section className="support-hero-grid">
            <section className="support-hero" style={{ '--support-bunner': `url(${supportBanner})` }}>
                <div className="support-hero__content">
                    <p className="support-eyebrow">{t('support.hero.eyebrow')}</p>
                    <h1>{t('support.hero.title')} <span className="glow-text">{t('support.hero.titleHighlight')}</span></h1>
                    <p>{t('support.hero.description')}</p>
                </div>
            </section>

            <GlowEffect>
                <aside className="glow-effect support-status-panel" aria-label={t('support.status.ariaLabel')}>
                    <span className="support-eyebrow"><p>{t('support.status.eyebrow')}</p></span>
                    <strong>24/7</strong>
                    <p>{t('support.status.text')}</p>
                    <small>
                        <i className="fas fa-circle-check"></i>
                        {t('support.status.note')}
                    </small>
                </aside>
            </GlowEffect>
        </section>
    )
}

export default SupportHero
