import { useCallback, useEffect, useMemo, useRef } from 'react'

import {
    MOBILE_CONTROL_METHODS,
    TOUCH_ACTIONS,
    TOUCH_GESTURES,
    loadMobileControlSettings,
} from '@/features/tetris/model/mobileControls.js'
import { EFFECT_TYPES, hasEffect } from '@/features/tetris/model/effects.js'
import { PC_CONTROL_ACTIONS } from '@/features/tetris/model/pcControls.js'
import { applyTetrisAction } from '@/features/tetris/hooks/useTetrisControls.js'
import { withDerivedState } from '@/features/tetris/model/tetrisEngine.js'

const DOUBLE_TAP_DELAY = 260
const LONG_SWIPE_FACTOR = 3

const getTouchPointsSupported = () => (
    typeof window !== 'undefined' &&
    ('ontouchstart' in window || Number(window.navigator?.maxTouchPoints) > 0)
)

const getActionCode = (action) => {
    switch (action) {
        case TOUCH_ACTIONS.MOVE_LEFT:
            return PC_CONTROL_ACTIONS.MOVE_LEFT
        case TOUCH_ACTIONS.MOVE_RIGHT:
            return PC_CONTROL_ACTIONS.MOVE_RIGHT
        case TOUCH_ACTIONS.SOFT_DROP:
            return PC_CONTROL_ACTIONS.SOFT_DROP
        case TOUCH_ACTIONS.ROTATE:
            return PC_CONTROL_ACTIONS.ROTATE
        case TOUCH_ACTIONS.HARD_DROP:
            return PC_CONTROL_ACTIONS.HARD_DROP
        default:
            return null
    }
}

export const useMobileTetrisControls = ({
    disabled = false,
    onAction,
    randomPiece,
    setGameState,
    targetRef,
} = {}) => {
    const disabledRef = useRef(disabled)
    const lastTapRef = useRef(0)
    const pendingTapRef = useRef(null)

    useEffect(() => {
        disabledRef.current = disabled
    }, [disabled])

    const settings = useMemo(() => loadMobileControlSettings(), [])
    const runAction = useCallback((action) => {
        const tetrisAction = getActionCode(action)

        if (!tetrisAction) {
            return
        }

        if (!disabledRef.current) {
            onAction?.(tetrisAction)
        }

        setGameState((prevState) => {
            const state = withDerivedState(prevState)

            if (
                disabledRef.current ||
                state.isClearing ||
                state.isGameOver ||
                state.isPaused ||
                state.isChoosingAbility
            ) {
                return prevState
            }

            if (hasEffect(state, EFFECT_TYPES.DELAY_INPUT)) {
                setTimeout(() => {
                    setGameState((latestState) => applyTetrisAction(latestState, tetrisAction, { randomPiece }))
                }, 150)

                return prevState
            }

            return applyTetrisAction(prevState, tetrisAction, { randomPiece })
        })
    }, [onAction, randomPiece, setGameState])

    useEffect(() => {
        const target = targetRef?.current

        if (!target || !getTouchPointsSupported() || settings.method !== MOBILE_CONTROL_METHODS.GESTURES) {
            return undefined
        }

        let activePointerId = null
        let startX = 0
        let startY = 0
        let startTime = 0
        let consumedX = 0
        let consumedY = 0
        let hasMoved = false

        const runGesture = (gesture) => runAction(settings.gestureActions[gesture])

        const handlePointerDown = (event) => {
            if (disabledRef.current || event.pointerType !== 'touch') {
                return
            }

            activePointerId = event.pointerId
            startX = event.clientX
            startY = event.clientY
            startTime = Date.now()
            consumedX = 0
            consumedY = 0
            hasMoved = false
            target.setPointerCapture?.(event.pointerId)
            event.preventDefault()
        }

        const handlePointerMove = (event) => {
            if (event.pointerId !== activePointerId) {
                return
            }

            const deltaX = event.clientX - startX
            const deltaY = event.clientY - startY
            const absX = Math.abs(deltaX)
            const absY = Math.abs(deltaY)

            if (absX > settings.sensitivity.tapMaxMove || absY > settings.sensitivity.tapMaxMove) {
                hasMoved = true
            }

            if (absX > absY && absX >= settings.sensitivity.minSwipe) {
                let steps = Math.trunc((absX - Math.abs(consumedX)) / settings.sensitivity.repeatStep)

                if (Math.abs(consumedX) === 0 && steps === 0) {
                    steps = 1
                }

                if (steps > 0) {
                    const gesture = deltaX > 0 ? TOUCH_GESTURES.SWIPE_RIGHT : TOUCH_GESTURES.SWIPE_LEFT

                    for (let index = 0; index < steps; index += 1) {
                        runGesture(gesture)
                    }

                    consumedX += steps * settings.sensitivity.repeatStep * Math.sign(deltaX)
                }
            }

            if (deltaY > 0 && absY >= settings.sensitivity.minSwipe && absY >= absX) {
                let steps = Math.trunc((absY - consumedY) / settings.sensitivity.repeatStep)

                if (consumedY === 0 && steps === 0) {
                    steps = 1
                }

                if (steps > 0) {
                    for (let index = 0; index < steps; index += 1) {
                        runGesture(TOUCH_GESTURES.SWIPE_DOWN_SHORT)
                    }

                    consumedY += steps * settings.sensitivity.repeatStep
                }
            }

            event.preventDefault()
        }

        const handlePointerUp = (event) => {
            if (event.pointerId !== activePointerId) {
                return
            }

            const deltaX = event.clientX - startX
            const deltaY = event.clientY - startY
            const absX = Math.abs(deltaX)
            const absY = Math.abs(deltaY)
            const elapsed = Date.now() - startTime
            const isTap = elapsed <= settings.sensitivity.tapMaxTime &&
                absX <= settings.sensitivity.tapMaxMove &&
                absY <= settings.sensitivity.tapMaxMove
            const longSwipeDistance = settings.sensitivity.repeatStep * LONG_SWIPE_FACTOR

            if (isTap) {
                const now = Date.now()

                if (now - lastTapRef.current <= DOUBLE_TAP_DELAY) {
                    window.clearTimeout(pendingTapRef.current)
                    pendingTapRef.current = null
                    lastTapRef.current = 0
                    runGesture(TOUCH_GESTURES.DOUBLE_TAP)
                } else {
                    lastTapRef.current = now
                    pendingTapRef.current = window.setTimeout(() => {
                        runGesture(TOUCH_GESTURES.TAP)
                        pendingTapRef.current = null
                    }, DOUBLE_TAP_DELAY)
                }
            } else if (hasMoved && deltaY > 0 && absY >= absX) {
                if (absY >= longSwipeDistance) {
                    runGesture(TOUCH_GESTURES.SWIPE_DOWN_LONG)
                } else if (absY >= settings.sensitivity.minSwipe && consumedY === 0) {
                    runGesture(TOUCH_GESTURES.SWIPE_DOWN_SHORT)
                }
            }

            activePointerId = null
            target.releasePointerCapture?.(event.pointerId)
            event.preventDefault()
        }

        const handlePointerCancel = (event) => {
            if (event.pointerId !== activePointerId) {
                return
            }

            activePointerId = null
            target.releasePointerCapture?.(event.pointerId)
        }

        target.addEventListener('pointerdown', handlePointerDown, { passive: false })
        target.addEventListener('pointermove', handlePointerMove, { passive: false })
        target.addEventListener('pointerup', handlePointerUp, { passive: false })
        target.addEventListener('pointercancel', handlePointerCancel)

        return () => {
            window.clearTimeout(pendingTapRef.current)
            target.removeEventListener('pointerdown', handlePointerDown)
            target.removeEventListener('pointermove', handlePointerMove)
            target.removeEventListener('pointerup', handlePointerUp)
            target.removeEventListener('pointercancel', handlePointerCancel)
        }
    }, [runAction, settings, targetRef])

    return {
        isButtonsEnabled: getTouchPointsSupported() && settings.method === MOBILE_CONTROL_METHODS.BUTTONS,
        runAction,
        settings,
    }
}
