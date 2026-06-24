import { useEffect, useState } from 'react'

import './delay-input.css'

const getRemainingMs = (feedback, now) => (
    Math.max(0, Math.ceil((Number(feedback?.executeAt) || 0) - now))
)

const DelayInputBoardEffect = ({ feedback = null, feedbackActive = false }) => {
    const [now, setNow] = useState(() => Date.now())
    const delayMs = Math.max(1, Number(feedback?.delayMs) || 1)
    const remainingMs = getRemainingMs(feedback, now)
    const progress = Math.min(1, remainingMs / delayMs)

    useEffect(() => {
        if (!feedbackActive || !feedback?.executeAt) {
            return undefined
        }

        let frameId = 0
        const tick = () => {
            setNow(Date.now())

            if (Date.now() < feedback.executeAt) {
                frameId = window.requestAnimationFrame(tick)
            }
        }

        frameId = window.requestAnimationFrame(tick)

        return () => window.cancelAnimationFrame(frameId)
    }, [feedback?.executeAt, feedbackActive])

    if (!feedbackActive || !feedback?.executeAt || remainingMs <= 0) {
        return null
    }

    return (
        <div
            className="delay-input-board-effect"
            style={{
                '--delay-scale': 0.58 + progress * 0.62,
            }}
        >
            <strong>{remainingMs}</strong>
        </div>
    )
}

export default DelayInputBoardEffect
