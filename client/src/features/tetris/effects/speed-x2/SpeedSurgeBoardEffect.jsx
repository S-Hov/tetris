import './speed-surge.css'

const SURGE_LINES = [
    { x: 7, delay: -0.04, duration: 0.34, height: 48, width: 2 },
    { x: 15, delay: -0.18, duration: 0.4, height: 62, width: 3 },
    { x: 24, delay: -0.1, duration: 0.32, height: 54, width: 2 },
    { x: 36, delay: -0.26, duration: 0.38, height: 68, width: 4 },
    { x: 47, delay: -0.14, duration: 0.3, height: 46, width: 2 },
    { x: 58, delay: -0.34, duration: 0.42, height: 72, width: 3 },
    { x: 69, delay: -0.22, duration: 0.36, height: 56, width: 2 },
    { x: 81, delay: -0.08, duration: 0.33, height: 64, width: 4 },
    { x: 92, delay: -0.3, duration: 0.39, height: 52, width: 2 },
]

const SPEED_MARKERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left']

const SpeedSurgeBoardEffect = () => (
    <div className="speed-surge-board-effect" aria-hidden="true">
        <div className="speed-surge-board-effect__field" />
        <div className="speed-surge-board-effect__tunnel" />
        <div className="speed-surge-board-effect__lines">
            {SURGE_LINES.map((line, index) => (
                <span
                    key={index}
                    style={{
                        '--speed-line-delay': `${line.delay}s`,
                        '--speed-line-duration': `${line.duration}s`,
                        '--speed-line-height': `${line.height}%`,
                        '--speed-line-width': `${line.width}px`,
                        '--speed-line-x': `${line.x}%`,
                    }}
                />
            ))}
        </div>
        {SPEED_MARKERS.map((position) => (
            <span
                className={`speed-surge-board-effect__marker speed-surge-board-effect__marker--${position}`}
                key={position}
            />
        ))}
    </div>
)

export default SpeedSurgeBoardEffect
