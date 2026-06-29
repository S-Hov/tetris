import './screen-shake.css'

const SHOCK_LINES = [
    { x: 12, y: 8, rotate: -12, delay: -0.18 },
    { x: 78, y: 14, rotate: 16, delay: -0.42 },
    { x: 28, y: 72, rotate: 11, delay: -0.28 },
    { x: 66, y: 84, rotate: -15, delay: -0.56 },
]

const ScreenShakeBoardEffect = () => (
    <div className="screen-shake-board-effect" aria-hidden="true">
        <div className="screen-shake-board-effect__quake-field" />
        <div className="screen-shake-board-effect__shockwave screen-shake-board-effect__shockwave--one" />
        <div className="screen-shake-board-effect__shockwave screen-shake-board-effect__shockwave--two" />
        <div className="screen-shake-board-effect__dust" />
        {SHOCK_LINES.map((line, index) => (
            <span
                className="screen-shake-board-effect__fault"
                key={index}
                style={{
                    '--shake-fault-delay': `${line.delay}s`,
                    '--shake-fault-rotate': `${line.rotate}deg`,
                    '--shake-fault-x': `${line.x}%`,
                    '--shake-fault-y': `${line.y}%`,
                }}
            />
        ))}
    </div>
)

export default ScreenShakeBoardEffect
