import loseImage from '@/features/tetris/assets/results/lose.png'
import winImage from '@/features/tetris/assets/results/win.png'

const resultContent = {
    lose: {
        eyebrow: 'Game Over',
        title: 'Поражение',
        description: 'Поле переполнено. Соберите дыхание, перезапустите партию и верните контроль над темпом.',
        image: loseImage,
    },
    win: {
        eyebrow: 'Round Complete',
        title: 'Победа',
        description: 'Вы забрали этот раунд. Соперник сломался под давлением, а вы держали темп до конца.',
        image: winImage,
    },
}

const MatchResultBanner = ({ result, actions = [], description, eyebrow, title }) => {
    const content = resultContent[result] || resultContent.lose

    return (
        <div className={`game-result game-result--${result}`} role="dialog" aria-modal="true" aria-labelledby="game-result-title">
            <div className="game-result__backdrop" aria-hidden="true" />
            <div className="game-result__panel">
                <div className="game-result__media" aria-hidden="true">
                    <img src={content.image} alt="" draggable="false" />
                    <span className="game-result__halo" />
                </div>

                <div className="game-result__content">
                    <span className="game-result__eyebrow">{eyebrow || content.eyebrow}</span>
                    <h3 className="game-result__title" id="game-result-title">{title || content.title}</h3>
                    <p className="game-result__description">{description || content.description}</p>

                    {actions.length > 0 ? (
                        <div className="game-result__actions">
                            {actions.map((action) => (
                                <button
                                    type="button"
                                    key={action.key}
                                    className={`button game-result__button ${action.variant === 'secondary' ? 'game-result__button--secondary' : ''}`}
                                    onClick={action.onClick}
                                >
                                    <i className={`fa-solid ${action.icon}`} aria-hidden="true"></i>
                                    {action.label}
                                </button>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    )
}

export default MatchResultBanner
