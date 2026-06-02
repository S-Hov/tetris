import { useTranslation } from 'react-i18next'

import GlowEffect from '@/shared/ui/GlowEffect'

import { featureCardsMeta } from './aboutFeatures.data.js'

import './AboutFeatures.css'

const AboutFeatures = () => {
    const { t } = useTranslation()
    const featureCards = featureCardsMeta.map((feature) => ({
        ...feature,
        title: t(`about.features.items.${feature.key}.title`),
        items: t(`about.features.items.${feature.key}.items`, { returnObjects: true }),
        note: t(`about.features.items.${feature.key}.note`, { defaultValue: '' }),
    }))

    return (
        <section className="about-block" aria-labelledby="about-features-title">
            <h2 className="about-block__title" id="about-features-title">{t('about.features.title')}</h2>
            <div className="about-features">
                {featureCards.map((feature) => (
                    <article className="about-feature-card" key={feature.title}>
                        <GlowEffect>
                            <div className="glow-effect about-feature-card__inner">
                                <i className={feature.icon}></i>
                                <div>
                                    <h3>{feature.title}</h3>
                                    <ul>
                                        {feature.items.map((item) => (
                                            <li key={item}>{item}</li>
                                        ))}
                                    </ul>
                                    {feature.note ? <p>{feature.note}</p> : null}
                                </div>
                            </div>
                        </GlowEffect>
                    </article>
                ))}
            </div>
        </section>
    )
}

export default AboutFeatures
