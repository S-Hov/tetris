import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { getLocalizedGamePath } from '@/i18n'
import { gameModesMeta } from './homeModes.data.js'

import './GameModesSection.css'

const GameModesSection = () => {
    const { t } = useTranslation()
    const gameModes = gameModesMeta.map((mode) => ({
        ...mode,
        title: t(`home.modes.items.${mode.key}.title`),
        label: t(`home.modes.items.${mode.key}.label`, { defaultValue: '' }),
        description: t(`home.modes.items.${mode.key}.description`),
        queue: t(`home.modes.items.${mode.key}.queue`, { defaultValue: '' }),
        to: getLocalizedGamePath(mode.to),
    }))

    return (
        <section className="home-modes" aria-labelledby="home-modes-title">
            <h2 id="home-modes-title">
                <i className="fas fa-check"></i>
                {t('home.modes.title')}
            </h2>

            <div className="home-modes__grid">
                {gameModes.map((mode) => (
                    <Link
                        className={`home-mode-card home-mode-card--${mode.tone}`}
                        key={mode.key}
                        to={mode.to}
                        style={{ '--mode-bg': `url(${mode.image})` }}
                    >
                        {mode.label ? <span className="home-mode-card__label">{mode.label}</span> : null}
                        <span className="home-mode-card__title">{mode.title}</span>
                        <span className="home-mode-card__description">{mode.description}</span>
                        <span className="home-mode-card__footer">
                            <span>{mode.queue}</span>
                            <i className="fas fa-arrow-right"></i>
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    )
}

export default GameModesSection
