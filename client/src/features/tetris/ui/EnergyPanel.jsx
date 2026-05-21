const EnergyPanel = ({ energy }) => {
    return (
        <section className="game-energy-panel">
            <p className="game-energy-panel__label"><i className="fa-solid fa-bolt"></i> Skill Energy</p>
            <div className="game-energy-panel__bar">
                <div
                    className="game-energy-panel__fill"
                    style={{ height: `${energy}%`, '--energy-percent': `${energy}%` }}
                />
            </div>
            <span className="game-energy-panel__value">{energy}%</span>
        </section>
    )
}

export default EnergyPanel
