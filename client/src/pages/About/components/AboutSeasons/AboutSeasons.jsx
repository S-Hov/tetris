import { useTranslation } from 'react-i18next'

import { seasonsMeta } from './aboutSeasons.data.js'

import './AboutSeasons.css'

const AboutSeasons = () => {
    const { t } = useTranslation()
    const seasons = seasonsMeta.map((season) => ({
        ...season,
        title: t(`about.seasons.items.${season.key}.title`),
        items: t(`about.seasons.items.${season.key}.items`, { returnObjects: true }),
    }))

    return (
        <section className="about-block" aria-labelledby="about-seasons-title">
            <h2 className="about-block__title" id="about-seasons-title">{t('about.seasons.title')}</h2>
            <div className="about-seasons">
                {seasons.map((season) => (
                    <article className="about-season-card" key={season.title}>
                        <img src={season.image} alt={season.title} />
                        <div className="about-season-card__content">
                            <div className="about-season-card__head">
                                <h3>{season.title}</h3>
                                <span>
                                    <i className={season.status === 'done' ? 'fas fa-check' : 'fas fa-circle'}></i>
                                </span>
                            </div>
                            <ul>
                                {season.items.map((item) => (
                                    <li key={item}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    )
}

export default AboutSeasons
