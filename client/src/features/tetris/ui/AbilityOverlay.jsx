import { useTranslation } from 'react-i18next'

import { getLocalizedEffectText } from '../effects/catalog.js'

const AbilityOverlay = ({ title, eyebrow, secondsLeft, options, onChoose }) => {
    const optionCount = options.length
    const { i18n } = useTranslation()
    const language = i18n.language === 'en' ? 'en' : 'ru'

    return (
        <div className="game-overlay" role="dialog" aria-modal="true" aria-labelledby="ability-title">
            <div className="game-overlay__panel">
                <div className="game-overlay__header">
                    <span className="game-overlay__eyebrow">{eyebrow}</span>
                    <h3 className="game-overlay__title" id="ability-title">{title}</h3>
                    <p className="game-overlay__description">
                        {language === 'en'
                            ? `Choice closes in ${secondsLeft}s`
                            : `Выбор закроется через ${secondsLeft}с`}
                    </p>
                </div>

                <div className={`game-overlay__options game-overlay__options--count-${optionCount}`}>
                    {options.map((ability) => {
                        const localized = getLocalizedEffectText(ability, language)

                        return (
                            <button
                                type="button"
                                className="game-overlay__card"
                                key={ability.id}
                                onClick={() => onChoose(ability)}
                            >
                                <span className={`game-overlay__card-visual game-overlay__card-visual--${ability.visual}`}>
                                    {ability.imageUrl ? (
                                        <img src={ability.imageUrl} alt="" aria-hidden="true" />
                                    ) : (
                                        <i className={`fa-solid ${ability.icon}`} aria-hidden="true"></i>
                                    )}
                                </span>
                                <span className="game-overlay__card-body">
                                    <span className="game-overlay__card-label">{localized.label}</span>
                                    <span className="game-overlay__card-title">{localized.title}</span>
                                    <span className="game-overlay__card-description">{localized.description}</span>
                                </span>
                            </button>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default AbilityOverlay
