import { useTranslation } from 'react-i18next'

import { getLocalizedEffectText } from '../catalog.js'

import './effect-preview-panel.css'

const EffectPreviewPanel = ({
    activeEffectKey = '',
    effects = [],
    onClear,
    onPreview,
}) => {
    const { i18n } = useTranslation()
    const language = i18n.language === 'en' ? 'en' : 'ru'

    return (
        <aside className="effect-preview-panel" aria-label={language === 'en' ? 'Effect testing' : 'Тестирование эффектов'}>
            <header className="effect-preview-panel__header">
                <span>DEV LAB</span>
                <strong>{language === 'en' ? 'Effects' : 'Эффекты'}</strong>
                <button
                    type="button"
                    title={language === 'en' ? 'Clear effects' : 'Очистить эффекты'}
                    onClick={onClear}
                >
                    <i className="fa-solid fa-xmark" />
                </button>
            </header>

            <div className="effect-preview-panel__list">
                {effects.map((effect) => {
                    const effectKey = effect.effectKey || effect.key || effect.id
                    const isActive = activeEffectKey === effectKey
                    const localized = getLocalizedEffectText(effect, language)

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
                                <strong>{localized.title || effectKey}</strong>
                                <small>
                                    {language === 'en'
                                        ? `${Math.max(1, Math.round(effect.durationMs / 1000))} sec.`
                                        : `${Math.max(1, Math.round(effect.durationMs / 1000))} сек.`}
                                </small>
                            </span>
                        </button>
                    )
                })}
            </div>
        </aside>
    )
}

export default EffectPreviewPanel
