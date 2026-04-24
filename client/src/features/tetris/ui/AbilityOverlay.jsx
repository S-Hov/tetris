const AbilityOverlay = ({ title, eyebrow, secondsLeft, options, onChoose }) => {
    return (
        <div className="game-overlay" role="dialog" aria-modal="true" aria-labelledby="ability-title">
            <div className="game-overlay__panel">
                <div className="game-overlay__header">
                    <span className="game-overlay__eyebrow">{eyebrow}</span>
                    <h3 className="game-overlay__title" id="ability-title">{title}</h3>
                    <p className="game-overlay__description">{secondsLeft}s left</p>
                </div>

                <div className="game-overlay__options">
                    {options.map((ability) => (
                        <button
                            type="button"
                            className="game-overlay__card"
                            key={ability.id}
                            onClick={() => onChoose(ability)}
                        >
                            <span className={`game-overlay__card-visual game-overlay__card-visual--${ability.visual}`}>
                                <i className={`fa-solid ${ability.icon}`} aria-hidden="true"></i>
                            </span>
                            <span className="game-overlay__card-label">{ability.label}</span>
                            <span className="game-overlay__card-title">{ability.title}</span>
                            <span className="game-overlay__card-description">{ability.description}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default AbilityOverlay
