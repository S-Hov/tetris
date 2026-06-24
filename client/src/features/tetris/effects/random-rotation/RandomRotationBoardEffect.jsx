import './random-rotation.css'

const RETICLES = ['top-left', 'top-right', 'bottom-right', 'bottom-left']
const GHOSTS = [
    { angle: -18, delay: -0.1 },
    { angle: 12, delay: -0.34 },
    { angle: 28, delay: -0.58 },
]

const RandomRotationBoardEffect = ({ feedbackActive = false }) => (
    <div
        className={`random-rotation-board-effect ${feedbackActive ? 'is-rotating' : ''}`}
        aria-hidden="true"
    >
        <div className="random-rotation-board-effect__field" />
        <div className="random-rotation-board-effect__gyro random-rotation-board-effect__gyro--outer" />
        <div className="random-rotation-board-effect__gyro random-rotation-board-effect__gyro--inner" />
        <div className="random-rotation-board-effect__axis random-rotation-board-effect__axis--x" />
        <div className="random-rotation-board-effect__axis random-rotation-board-effect__axis--y" />
        {RETICLES.map((position) => (
            <span
                className={`random-rotation-board-effect__reticle random-rotation-board-effect__reticle--${position}`}
                key={position}
            />
        ))}
        {GHOSTS.map((ghost, index) => (
            <span
                className="random-rotation-board-effect__ghost"
                key={index}
                style={{
                    '--ghost-angle': `${ghost.angle}deg`,
                    '--ghost-delay': `${ghost.delay}s`,
                }}
            />
        ))}
        <div className="random-rotation-board-effect__burst" />
    </div>
)

export default RandomRotationBoardEffect
