import './gravity-lock.css'

const GRAVITY_LINES = [
    { x: 9, delay: -0.08, duration: 0.54, height: 42 },
    { x: 18, delay: -0.38, duration: 0.68, height: 56 },
    { x: 29, delay: -0.2, duration: 0.6, height: 48 },
    { x: 41, delay: -0.62, duration: 0.72, height: 64 },
    { x: 53, delay: -0.3, duration: 0.58, height: 50 },
    { x: 65, delay: -0.76, duration: 0.66, height: 58 },
    { x: 76, delay: -0.14, duration: 0.62, height: 44 },
    { x: 88, delay: -0.48, duration: 0.7, height: 60 },
]

const GravityLockBoardEffect = ({ effect, feedbackActive = false }) => {
    const isFeedbackOnly = !effect?.expiresAt

    return (
        <div
            className={[
                'gravity-lock-board-effect',
                feedbackActive ? 'is-denied' : '',
                isFeedbackOnly ? 'is-feedback-only' : '',
            ].filter(Boolean).join(' ')}
            aria-hidden="true"
        >
            {!isFeedbackOnly ? (
                <>
                    <div className="gravity-lock-board-effect__pressure gravity-lock-board-effect__pressure--top" />
                    <div className="gravity-lock-board-effect__pressure gravity-lock-board-effect__pressure--bottom" />
                    <div className="gravity-lock-board-effect__fall-lines">
                        {GRAVITY_LINES.map((line, index) => (
                            <span
                                key={index}
                                style={{
                                    '--gravity-line-delay': `${line.delay}s`,
                                    '--gravity-line-duration': `${line.duration}s`,
                                    '--gravity-line-height': `${line.height}%`,
                                    '--gravity-line-x': `${line.x}%`,
                                }}
                            />
                        ))}
                    </div>
                    <div className="gravity-lock-board-effect__rails">
                        <span />
                        <span />
                    </div>
                </>
            ) : null}
            <div className="gravity-lock-board-effect__center-lock">
                <span className="gravity-lock-board-effect__cross" />
                <span className="gravity-lock-board-effect__ring" />
                <span className="gravity-lock-board-effect__label">LOCKED</span>
            </div>
        </div>
    )
}

export default GravityLockBoardEffect
