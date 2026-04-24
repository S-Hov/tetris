const PlayerSummaryPanel = ({ title, score, lines, level, status }) => {
    return (
        <section className="game-panel game-player-summary">
            <h3 className="game-player-summary__title">{title}</h3>
            <p className="game-player-summary__row">Score: {score}</p>
            <p className="game-player-summary__row">Lines: {lines}</p>
            <p className="game-player-summary__row">Level: {level}</p>
            <p className="game-player-summary__row">Status: {status}</p>
        </section>
    )
}

export default PlayerSummaryPanel
