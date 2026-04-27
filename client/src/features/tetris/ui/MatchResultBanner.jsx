import loseImage from '@/features/tetris/assets/results/lose.png'
import winImage from '@/features/tetris/assets/results/win.png'

const resultContent = {
    lose: {
        description: 'Раунд ушёл сопернику. Через несколько секунд вы вернётесь к выбору следующего матча.',
        image: loseImage,
    },
    win: {
        description: 'Вы забрали темп и закрыли раунд. Через несколько секунд можно будет искать новую игру.',
        image: winImage,
    },
}

const MatchResultBanner = ({ result, actions = [], description }) => {
    const content = resultContent[result] || resultContent.lose

    return (
        <div className={`game-result game-result--${result}`} role="dialog" aria-modal="true" aria-label="Раунд завершён">
            <div className="game-result__backdrop" aria-hidden="true" />
            <div className="game-result__panel">
                <div className="game-result__media" aria-hidden="true">
                    <img src={content.image} alt="" draggable="false" />
                    <span className="game-result__halo" />
                </div>

                <div className="game-result__content">
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
