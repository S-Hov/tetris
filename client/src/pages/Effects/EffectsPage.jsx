import { Link } from 'react-router-dom'
import GlowEffect from '@/shared/ui/GlowEffect'
import { getLocalizedGamePath } from '@/i18n'
import { useEffectCatalog } from '@/features/tetris/effects/useEffectCatalog.js'
import './EffectsPage.css'

const EffectsPage = () => {
    const { effects, error, isLoading } = useEffectCatalog()

    return (
        <section className="section effects-page">
            <div className="container effects-container">
                <section className="effects-hero">
                    <GlowEffect>
                        <div className="glow-effect effects-hero__content">
                            <p className="effects-eyebrow">PvP effects</p>
                            <h1>Тетрис, где каждая линия может стать атакой</h1>
                            <p>
                                В режимах с эффектами игроки копят энергию и выбирают дебаффы для соперника:
                                ускорение, затемнение поля, сбитое управление и другие тактические помехи.
                            </p>
                            <Link className="button effects-hero__button" to={getLocalizedGamePath('/game/1v1')}>
                                <i className="fas fa-play"></i>
                                Играть с эффектами
                            </Link>
                        </div>
                    </GlowEffect>
                </section>

                <section className="effects-grid" aria-label="Список игровых эффектов">
                    {isLoading ? <p>Загрузка эффектов...</p> : null}
                    {error ? <p>Каталог эффектов временно недоступен.</p> : null}
                    {effects.map((effect) => (
                        <EffectCard effect={effect} key={effect.id || effect.key} />
                    ))}
                </section>
            </div>
        </section>
    )
}

export function EffectCard({ effect, compact = false }) {
    const imageUrl = effect.imageUrl || ''
    const label = effect.labelRu || effect.label || ''
    const title = effect.titleRu || effect.title || ''
    const description = effect.descriptionRu || effect.description || ''
    const durationSeconds = Number(effect.durationMs) > 100
        ? `${Math.round(Number(effect.durationMs) / 1000)} сек.`
        : 'Мгновенно'

    return (
        <article className={`effect-card ${compact ? 'effect-card--compact' : ''}`}>
            <GlowEffect>
                <div className="glow-effect effect-card__inner">
                    <div className={`effect-card__media effect-card__media--${effect.visual || 'default'}`}>
                        {imageUrl ? (
                            <img src={imageUrl} alt={title || label} />
                        ) : (
                            <i className={`fa-solid ${effect.icon || 'fa-bolt'}`} aria-hidden="true"></i>
                        )}
                    </div>
                    <div className="effect-card__body">
                        <span>{label}</span>
                        <h2>{title}</h2>
                        <p>{description}</p>
                    </div>
                    <footer className="effect-card__meta">
                        <span>{durationSeconds}</span>
                        <code>{effect.id || effect.key}</code>
                    </footer>
                </div>
            </GlowEffect>
        </article>
    )
}

export default EffectsPage
