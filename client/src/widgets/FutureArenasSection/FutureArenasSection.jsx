import { useTranslation } from 'react-i18next'

import { seasonsMeta } from './futureArenas.data.js'

import './FutureArenasSection.css'

const FutureArenasSection = () => {
    const { t } = useTranslation()
    const seasons = seasonsMeta.map((season) => ({
        ...season,
        title: t(`about.seasons.items.${season.key}.title`),
        items: t(`about.seasons.items.${season.key}.items`, { returnObjects: true }),
    }))

    return (
        <section className="future-arenas-section" aria-labelledby="future-arenas-title">
            <h2 className="future-arenas-section__title" id="future-arenas-title">{t('about.seasons.title')}</h2>
            <div className="future-arenas-section__grid">
                {seasons.map((season) => (
                    <article className="future-arena-card" key={season.title}>
                        <img src={season.image} alt={season.title} />
                        <div className="future-arena-card__content">
                            <div className="future-arena-card__head">
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

export default FutureArenasSection
