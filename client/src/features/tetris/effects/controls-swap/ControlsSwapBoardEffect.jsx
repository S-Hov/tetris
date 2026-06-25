import './controls-swap.css'

const getDirection = (action) => {
    switch (action) {
        case 'moveLeft':
            return 'left'
        case 'moveRight':
            return 'right'
        default:
            return 'neutral'
    }
}

const directionIcon = {
    left: '←',
    right: '→',
    neutral: '↔',
}

const ControlsSwapBoardEffect = ({ feedback = null, feedbackActive = false }) => {
    const resolvedDirection = getDirection(feedback?.resolvedAction)
    const requestedDirection = getDirection(feedback?.requestedAction)

    return (
        <div
            className={[
                'controls-swap-board-effect',
                feedbackActive ? 'is-swapping' : '',
                `controls-swap-board-effect--${resolvedDirection}`,
                feedbackActive ? `controls-swap-board-effect--pressed-${requestedDirection}` : '',
            ].filter(Boolean).join(' ')}
            aria-hidden="true"
        >
            <div className="controls-swap-board-effect__orbit">
                <span className="controls-swap-board-effect__orbit-arrow controls-swap-board-effect__orbit-arrow--top">↶</span>
                <span className="controls-swap-board-effect__orbit-arrow controls-swap-board-effect__orbit-arrow--bottom">↷</span>
            </div>
            <div className="controls-swap-board-effect__field" />
            <div className="controls-swap-board-effect__center">
                <span className="controls-swap-board-effect__requested">{directionIcon[requestedDirection]}</span>
                <strong>{directionIcon[resolvedDirection]}</strong>
                <small>SWAP</small>
            </div>
        </div>
    )
}

export default ControlsSwapBoardEffect
