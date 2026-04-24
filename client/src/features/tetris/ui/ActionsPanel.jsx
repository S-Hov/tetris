const ActionsPanel = ({ actions }) => {
    return (
        <section className="game-actions-panel">
            {actions.map((action) => (
                <button
                    key={action.key}
                    type="button"
                    className="game-actions-panel__button action-item button"
                    onClick={action.onClick}
                    disabled={action.disabled}
                    aria-pressed={action.pressed}
                >
                    {action.icon ? <i className={`fa-solid ${action.icon}`}></i> : null}
                    {action.label}
                </button>
            ))}
        </section>
    )
}

export default ActionsPanel
