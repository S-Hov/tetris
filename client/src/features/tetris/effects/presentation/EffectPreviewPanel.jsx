import './effect-preview-panel.css'

const EffectPreviewPanel = ({
    activeEffectKey = '',
    effects = [],
    onClear,
    onPreview,
}) => (
    <aside className="effect-preview-panel" aria-label="Тестирование эффектов">
        <header className="effect-preview-panel__header">
            <span>DEV LAB</span>
            <strong>Эффекты</strong>
            <button type="button" title="Очистить эффекты" onClick={onClear}>
                <i className="fa-solid fa-xmark" />
            </button>
        </header>

        <div className="effect-preview-panel__list">
            {effects.map((effect) => {
                const effectKey = effect.effectKey || effect.key || effect.id
                const isActive = activeEffectKey === effectKey

                return (
                    <button
                        className={`effect-preview-card ${isActive ? 'is-active' : ''}`}
                        key={effectKey}
                        type="button"
                        onClick={() => onPreview(effect)}
                    >
                        <span className="effect-preview-card__icon">
                            <i className={`fa-solid ${effect.icon || 'fa-bolt'}`} />
                        </span>
                        <span className="effect-preview-card__copy">
                            <strong>{effect.titleRu || effect.title || effectKey}</strong>
                            <small>{Math.max(1, Math.round(effect.durationMs / 1000))} сек.</small>
                        </span>
                    </button>
                )
            })}
        </div>
    </aside>
)

export default EffectPreviewPanel
