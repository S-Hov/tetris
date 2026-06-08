const joinClassNames = (...classNames) => classNames.filter(Boolean).join(' ')

const ActionsPanel = ({ actions }) => {
    return (
        <section className="game-actions-panel">
            {actions.map((action) => (
                <button
                    key={action.key}
                    type="button"
                    className={joinClassNames(
                        'game-actions-panel__button action-item button',
                        action.mobileOnly ? 'game-actions-panel__button--mobile-only' : ''
                    )}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    aria-pressed={action.pressed}
                    aria-label={action.label}
                >
                    {action.icon ? <i className={`fa-solid ${action.icon}`}></i> : null}
                    <span>{action.label}</span>
                </button>
            ))}
        </section>
    )
}

export default ActionsPanel
