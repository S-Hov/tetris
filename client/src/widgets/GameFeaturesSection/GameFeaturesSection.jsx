import { useTranslation } from 'react-i18next'

import GlowEffect from '@/shared/ui/GlowEffect'

import { featureCardsMeta } from './gameFeatures.data.js'

import './GameFeaturesSection.css'

const GameFeaturesSection = () => {
    const { t } = useTranslation()
    const featureCards = featureCardsMeta.map((feature) => ({
        ...feature,
        title: t(`about.features.items.${feature.key}.title`),
        items: t(`about.features.items.${feature.key}.items`, { returnObjects: true }),
        note: t(`about.features.items.${feature.key}.note`, { defaultValue: '' }),
    }))

    return (
        <section className="game-features-section" aria-labelledby="game-features-title">
            <h2 className="game-features-section__title" id="game-features-title">{t('about.features.title')}</h2>
            <div className="game-features-section__grid">
                {featureCards.map((feature) => (
                    <article className="game-feature-card" key={feature.title}>
                        <GlowEffect>
                            <div className="glow-effect game-feature-card__inner">
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

export default GameFeaturesSection
