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

const STAT_LABELS = {
    score: 'Score',
    lines: 'Lines',
    level: 'Level',
    record: 'Record',
}

const getPlayerStats = (player) => [
    { key: 'score', value: player.score },
    { key: 'lines', value: player.lines },
    { key: 'level', value: player.level },
    player.record !== undefined ? { key: 'record', value: player.record } : null,
].filter(Boolean)

const MatchResultBanner = ({ result, actions = [], description, stats = null }) => {
    const content = resultContent[result] || resultContent.lose
    const primaryStats = stats?.primary || null
    const secondaryStats = Array.isArray(stats?.secondary) ? stats.secondary : []

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

                    {primaryStats ? (
                        <div className="game-result__stats" aria-label="Game statistics">
                            <section className="game-result__stats-primary">
                                <span className="game-result__stats-name">{primaryStats.name || 'You'}</span>
                                <div className="game-result__stats-grid">
                                    {getPlayerStats(primaryStats).map((stat) => (
                                        <span key={stat.key} className="game-result__stat">
                                            <small>{STAT_LABELS[stat.key]}</small>
                                            <strong>{stat.value}</strong>
                                        </span>
                                    ))}
                                </div>
                            </section>

                            {secondaryStats.length > 0 ? (
                                <div className="game-result__stats-secondary">
                                    {secondaryStats.map((player) => (
                                        <section key={player.id || player.name} className="game-result__stats-compact">
                                            <span>{player.name || 'Player'}</span>
                                            <strong>{player.score}</strong>
                                            <small>{player.lines} lines - lvl {player.level}</small>
                                        </section>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    ) : null}

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
