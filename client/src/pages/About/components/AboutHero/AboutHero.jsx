import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import GlowEffect from '@/shared/ui/GlowEffect'
import { getLocalizedGamePath } from '@/i18n'

import aboutHeroImage from './assets/about-hero.png'

import './AboutHero.css'

const AboutHero = ({ currentLanguage }) => {
    const { t } = useTranslation()

    return (
        <section className="about-hero">
            <GlowEffect>
                <div className="about-hero__background" aria-hidden="true">
                    <img src={aboutHeroImage} alt="" />
                </div>
                <div className="about-hero__copy">
                    <p className="about-kicker">{t('about.hero.kicker')}</p>
                    <h1>{t('about.hero.title')}</h1>
                    <p className="about-hero__lead glow-text">{t('about.hero.lead')}</p>
                    <p>{t('about.hero.description')}</p>
                    <div className="about-hero__actions">
                        <Link to={getLocalizedGamePath('/game/1v1', currentLanguage)} className="button about-button about-button--primary">
                            <i className="fas fa-play"></i>
                            {t('about.hero.play')}
                        </Link>
                        <Link to={`/${currentLanguage}/support`} className="button about-button about-button--ghost">
                            <i className="fas fa-headset"></i>
                            {t('about.hero.support')}
                        </Link>
                    </div>
                </div>
            </GlowEffect>
        </section>
    )
}

export default AboutHero
