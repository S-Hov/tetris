import './signal-loss.css'

const INTERFERENCE_BANDS = [
    { delay: -0.08, duration: 0.74, height: 5, y: 8 },
    { delay: -0.42, duration: 0.58, height: 2, y: 18 },
    { delay: -0.2, duration: 0.68, height: 7, y: 31 },
    { delay: -0.64, duration: 0.52, height: 3, y: 47 },
    { delay: -0.34, duration: 0.8, height: 6, y: 62 },
    { delay: -0.54, duration: 0.6, height: 2, y: 77 },
    { delay: -0.14, duration: 0.7, height: 4, y: 89 },
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
