import './garbage-rain.css'

const GarbageRainBoardEffect = ({ feedback = null, feedbackActive = false }) => {
    const drops = feedbackActive && Array.isArray(feedback?.placements)
        ? feedback.placements
        : []

    if (drops.length === 0) {
        return null
    }

    return (
        <div
            className={`garbage-rain-board-effect ${feedbackActive ? 'is-dropping' : ''}`}
            aria-hidden="true"
        >
            {drops.map((drop, index) => (
                <span
                    className="garbage-rain-board-effect__drop"
                    key={`${drop.x}-${drop.y}-${index}`}
                    style={{
                        '--drop-delay': `${Number(drop.delayMs) || index * 95}ms`,
                        '--drop-end-x': `${(drop.x + 0.5) * 10}%`,
                        '--drop-end-y': `${(drop.y + 0.5) * 5}%`,
                        '--drop-index': index,
                        '--drop-start-x': `${-18 + index * 7}%`,
                    }}
                >
                    <span />
                </span>
            ))}
            {drops.map((drop, index) => (
                <span
                    className="garbage-rain-board-effect__impact"
                    key={`impact-${drop.x}-${drop.y}-${index}`}
                    style={{
                        '--drop-delay': `${Number(drop.delayMs) || index * 95}ms`,
                        '--drop-end-x': `${(drop.x + 0.5) * 10}%`,
                        '--drop-end-y': `${(drop.y + 0.5) * 5}%`,
                    }}
                />
            ))}
        </div>
    )
}

export default GarbageRainBoardEffect
