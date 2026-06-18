import { Children, cloneElement, isValidElement } from 'react'

import useUserActions from '@/shared/hooks/useUserActions.js'

const INTERACTIVE_SELECTOR = 'a, button, input, select, textarea, [role="button"], [data-user-actions-ignore]'

const PlayerActionTrigger = ({ asChild = false, children, className = '', disabled = false, player }) => {
    const { openUserActions } = useUserActions()
    const playerId = Number(player?.id ?? player?.userId)
    const isEnabled = !disabled && Number.isInteger(playerId) && playerId > 0

    const handleClick = (event) => {
        if (!isEnabled) {
            return
        }

        const nestedInteractive = event.target !== event.currentTarget
            ? event.target.closest(INTERACTIVE_SELECTOR)
            : null

        if (
            nestedInteractive &&
            nestedInteractive !== event.currentTarget &&
            event.currentTarget.contains(nestedInteractive)
        ) {
            return
        }

        event.preventDefault()
        openUserActions({ ...player, id: playerId }, event.currentTarget)
    }

    const handleKeyDown = (event) => {
        if (!isEnabled || event.target !== event.currentTarget) {
            return
        }

        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            openUserActions({ ...player, id: playerId }, event.currentTarget)
        }
    }

    const triggerProps = {
        'aria-haspopup': isEnabled ? 'dialog' : undefined,
        'data-player-action-trigger': isEnabled ? '' : undefined,
        onClick: handleClick,
        onKeyDown: handleKeyDown,
    }

    if (asChild) {
        const child = Children.only(children)

        if (!isValidElement(child)) {
            return child
        }

        return cloneElement(child, {
            ...triggerProps,
            className: [child.props.className, className].filter(Boolean).join(' '),
            role: isEnabled ? (child.props.role || 'button') : child.props.role,
            tabIndex: isEnabled ? (child.props.tabIndex ?? 0) : child.props.tabIndex,
            onClick: (event) => {
                child.props.onClick?.(event)

                if (!event.defaultPrevented) {
                    handleClick(event)
                }
            },
            onKeyDown: (event) => {
                child.props.onKeyDown?.(event)

                if (!event.defaultPrevented) {
                    handleKeyDown(event)
                }
            },
        })
    }

    return (
        <span
            {...triggerProps}
            className={className}
            role={isEnabled ? 'button' : undefined}
            tabIndex={isEnabled ? 0 : undefined}
        >
            {children}
        </span>
    )
}

export default PlayerActionTrigger
