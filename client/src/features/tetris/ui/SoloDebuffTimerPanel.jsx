const SoloDebuffTimerPanel = ({
    intervalSeconds,
    progress,
    secondsLeft,
}) => {
    return (
        <section className="solo-debuff-panel game-panel">
            <div className="solo-debuff-panel__header">
                <span><i className="fa-solid fa-burst"></i> Подлянки</span>
                <strong>{secondsLeft}</strong>
            </div>

            <div
                className="solo-debuff-panel__progress"
                aria-hidden="true"
            >
                <span style={{ width: `${Math.min(Math.max(progress, 0), 1) * 100}%` }} />
            </div>

            <p className="solo-debuff-panel__interval">Интервал: {intervalSeconds} сек.</p>
        </section>
    )
}

export default SoloDebuffTimerPanel
