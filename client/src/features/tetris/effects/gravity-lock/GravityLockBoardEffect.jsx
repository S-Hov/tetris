import './gravity-lock.css'

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
