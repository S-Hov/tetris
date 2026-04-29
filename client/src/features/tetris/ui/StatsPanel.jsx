const StatsPanel = ({ score, lines, level, status, record = 0 }) => {
    return (
        <section className="game-panel game-stats-panel">
            <p className="game-stats-panel__row"><i className="fa-solid fa-star"></i> Score: <span className="game-stats-panel__value">{score}</span></p>
            <p className="game-stats-panel__row"><i className="fa-solid fa-grip-lines"></i> Lines: <span className="game-stats-panel__value">{lines}</span></p>
            <p className="game-stats-panel__row"><i className="fas fa-gauge-high"></i> Level: <span className="game-stats-panel__value">{level}</span></p>
            <p className="game-stats-panel__row"><i className="fa-solid fa-trophy"></i> РЕКОРД <span className="game-stats-panel__value">{record}</span></p>
            <p className="game-stats-panel__row">Status: {status}</p>
        </section>
    )
}

export default StatsPanel
