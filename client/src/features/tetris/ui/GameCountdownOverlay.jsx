import timer1Image from '@/features/tetris/assets/countdown/timer-1.png'
import timer2Image from '@/features/tetris/assets/countdown/timer-2.png'
import timer3Image from '@/features/tetris/assets/countdown/timer-3.png'

const countdownFrames = {
    1: {
        accent: '#ff4fd8',
        image: timer1Image,
        label: 'Lock in',
    },
    2: {
        accent: '#8f7dff',
        image: timer2Image,
        label: 'Set the rhythm',
    },
    3: {
        accent: '#31eaff',
        image: timer3Image,
        label: 'Get ready',
    },
}

const GameCountdownOverlay = ({ value }) => {
    const frame = countdownFrames[value] ?? countdownFrames[3]

    return (
        <div
            className="game-countdown"
            role="status"
            aria-live="polite"
            style={{ '--countdown-accent': frame.accent }}
        >
            <div className="game-countdown__vignette" aria-hidden="true" />
            <div className="game-countdown__system" key={`system-${value}`} aria-hidden="true">
                <span />
                <span />
                <span />
                <span />
            </div>

            <div className="game-countdown__stage" key={value}>
                <div className="game-countdown__ring game-countdown__ring--outer" aria-hidden="true" />
                <div className="game-countdown__ring game-countdown__ring--inner" aria-hidden="true" />
                <div className="game-countdown__pulse" aria-hidden="true" />

                <img
                    className="game-countdown__number"
                    src={frame.image}
                    alt={`${value}`}
                    draggable="false"
                />

                <div className="game-countdown__caption">
                    <span className="game-countdown__eyebrow">Round starts in</span>
                    <strong>{frame.label}</strong>
                </div>
            </div>
        </div>
    )
}

export default GameCountdownOverlay
