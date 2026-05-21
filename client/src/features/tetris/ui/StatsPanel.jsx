const StatsPanel = ({ score, lines, level, record = 0 }) => {
    return (
        <section className="game-panel game-stats-panel">
            <p className="game-stats-panel__row game-stats-panel__row--score">
                <i className="fa-solid fa-star"></i>
                <span className="game-stats-panel__label">Score</span>
                <span className="game-stats-panel__value">{score}</span>
            </p>
            <p className="game-stats-panel__row">
                <i className="fa-solid fa-grip-lines"></i>
                <span className="game-stats-panel__label">Lines</span>
                <span className="game-stats-panel__value">{lines}</span>
            </p>
            <p className="game-stats-panel__row">
                <i className="fas fa-gauge-high"></i>
                <span className="game-stats-panel__label">Level</span>
                <span className="game-stats-panel__value">{level}</span>
            </p>
            <p className="game-stats-panel__row">
                <i className="fa-solid fa-trophy"></i>
                <span className="game-stats-panel__label">Record</span>
                <span className="game-stats-panel__value">{record}</span>
            </p>
        </section>
    )
}

export default StatsPanel
