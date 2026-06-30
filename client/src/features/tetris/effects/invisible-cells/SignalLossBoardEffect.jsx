import './signal-loss.css'

const INTERFERENCE_BANDS = [
    { delay: -0.18, duration: 2.7, drift: 'slow', height: 10, y: 18 },
    { delay: -1.1, duration: 2.2, drift: 'snap', height: 7, y: 48 },
    { delay: -0.62, duration: 3.1, drift: 'float', height: 12, y: 76 },
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
                        '--signal-band-drift': `signal-loss-band-${band.drift}`,
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
