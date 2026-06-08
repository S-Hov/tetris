import { useRef } from 'react'

import { MOBILE_BUTTON_LABELS, MOBILE_BUTTON_ORDER } from '@/features/tetris/model/mobileControls.js'

import './MobileButtonsOverlay.css'

const REPEATABLE_ACTIONS = new Set(['moveLeft', 'moveRight', 'softDrop'])
const REPEAT_DELAY_MS = 135

const MobileButtonsOverlay = ({
    controls,
    disabled = false,
    onAction,
    visible = false,
} = {}) => {
    const repeatTimersRef = useRef({})

    if (!visible || !controls?.layout) {
        return null
    }

    const stopRepeat = (buttonId) => {
        window.clearInterval(repeatTimersRef.current[buttonId])
        delete repeatTimersRef.current[buttonId]
    }

    const handlePointerDown = (event, buttonId, buttonConfig) => {
        event.preventDefault()
        event.stopPropagation()

        if (disabled || !buttonConfig?.action) {
            return
        }

        onAction(buttonConfig.action)
        stopRepeat(buttonId)

        if (REPEATABLE_ACTIONS.has(buttonConfig.action)) {
            repeatTimersRef.current[buttonId] = window.setInterval(() => {
                onAction(buttonConfig.action)
            }, REPEAT_DELAY_MS)
        }
    }

    const handlePointerEnd = (event, buttonId) => {
        event.preventDefault()
        event.stopPropagation()
        stopRepeat(buttonId)
    }

    return (
        <div
            className="mobile-buttons-overlay"
            style={{ '--mobile-buttons-opacity': Number(controls.opacity ?? 86) / 100 }}
            aria-hidden={disabled}
        >
            {MOBILE_BUTTON_ORDER.map((buttonId) => {
                const buttonConfig = controls.layout[buttonId]

                return (
                    <button
                        className="mobile-buttons-overlay__button"
                        disabled={disabled}
                        key={buttonId}
                        style={{
                            '--button-x': `${buttonConfig.x}%`,
                            '--button-y': `${buttonConfig.y}%`,
                            '--button-size': `${buttonConfig.size}px`,
                        }}
                        type="button"
                        aria-label={MOBILE_BUTTON_LABELS[buttonId]}
                        onPointerDown={(event) => handlePointerDown(event, buttonId, buttonConfig)}
                        onPointerUp={(event) => handlePointerEnd(event, buttonId)}
                        onPointerCancel={(event) => handlePointerEnd(event, buttonId)}
                        onPointerLeave={(event) => handlePointerEnd(event, buttonId)}
                    >
                        <span>{buttonConfig.label}</span>
                    </button>
                )
            })}
        </div>
    )
}

export default MobileButtonsOverlay
