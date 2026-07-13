import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { getLocalizedPath } from '@/i18n'

import effectsLabBackground from './assets/effects-lab-bg.png'

import './EffectsLabSection.css'

const EffectsLabSection = () => {
    const { t } = useTranslation()

    return (
        <section
            className="effects-lab-section"
            style={{ '--effects-lab-bg': `url(${effectsLabBackground})` }}
            aria-labelledby="effects-lab-title"
        >
            <div className="effects-lab-section__content">
                <p className="effects-lab-section__eyebrow">
                    <i className="fas fa-flask" aria-hidden="true"></i>
                    {t('home.effectsLab.eyebrow')}
                </p>

                <h2 id="effects-lab-title">
                    <span>{t('home.effectsLab.title')}</span>
                    <strong>{t('home.effectsLab.titleHighlight')}</strong>
                </h2>

                <p className="effects-lab-section__description">
                    {t('home.effectsLab.description')}
                </p>

                <div className="effects-lab-section__actions">
                    <Link
                        className="effects-lab-section__button effects-lab-section__button--primary"
                        to={getLocalizedPath('/effects/preview')}
                    >
                        <i className="fas fa-flask" aria-hidden="true"></i>
                        <span>{t('home.effectsLab.testButton')}</span>
                    </Link>
                    <Link
                        className="effects-lab-section__button effects-lab-section__button--secondary"
                        to={getLocalizedPath('/effects')}
                    >
                        <i className="fas fa-eye" aria-hidden="true"></i>
                        <span>{t('home.effectsLab.catalogButton')}</span>
                        <i className="fas fa-chevron-right effects-lab-section__button-arrow" aria-hidden="true"></i>
                    </Link>
                </div>
            </div>
        </section>
    )
}

export default EffectsLabSection
