import './signal-loss.css'

const INTERFERENCE_BANDS = [
    { delay: -0.12, duration: 1.55, height: 2.4, y: 22 },
    { delay: -0.68, duration: 1.85, height: 1.7, y: 53 },
    { delay: -1.14, duration: 2.2, height: 2.8, y: 78 },
]

const SignalLossBoardEffect = () => (
    <div className="signal-loss-board-effect" aria-hidden="true">
        <div className="signal-loss-board-effect__wash" />
        <div className="signal-loss-board-effect__scan" />
        <div className="signal-loss-board-effect__noise" />
        <div className="signal-loss-board-effect__bands">
            {INTERFERENCE_BANDS.map((band, index) => (
                <span
                    key={index}
                    style={{
                        '--signal-band-delay': `${band.delay}s`,
                        '--signal-band-duration': `${band.duration}s`,
                        '--signal-band-height': `${band.height}%`,
                        '--signal-band-y': `${band.y}%`,
                    }}
                />
            ))}
        </div>
    </div>
)

export default SignalLossBoardEffect
