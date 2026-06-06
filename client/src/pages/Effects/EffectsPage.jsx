import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import GlowEffect from '@/shared/ui/GlowEffect'
import { getLocalizedGamePath } from '@/i18n'
import { effectsAPI } from '@/shared/api/effects'
import { getBaseUrl } from '@/shared/api/apiClient.js'
import './EffectsPage.css'

const fallbackEffects = [
    { id: 'speed_x2_for_4s', label: 'Overclock', labelRu: 'Перегрузка', title: 'Speed Surge', titleRu: 'Ускорение', description: 'Opponent pieces fall much faster for a short time.', descriptionRu: 'Фигуры соперника на короткое время начинают падать заметно быстрее.', icon: 'fa-gauge-high', visual: 'speed', durationMs: 4000 },
    { id: 'darkness', label: 'Blackout', labelRu: 'Затемнение', title: 'Darkness', titleRu: 'Тьма', description: 'Covers most of the opponent board with a dark veil.', descriptionRu: 'Почти всё поле соперника накрывает тёмная пелена.', icon: 'fa-moon', visual: 'darkness', durationMs: 10000 },
    { id: 'garbage_rain', label: 'Garbage Rain', labelRu: 'Мусорный дождь', title: 'Random Blocks', titleRu: 'Случайные блоки', description: 'Drops a few messy blocks into the opponent board.', descriptionRu: 'На поле соперника падают лишние случайные блоки.', icon: 'fa-cubes', visual: 'garbage', durationMs: 1 },
]

const EffectsPage = () => {
    const [effects, setEffects] = useState(fallbackEffects)

    useEffect(() => {
        let isCancelled = false

        const loadEffects = async () => {
            try {
                const response = await effectsAPI.getEffects()

                if (!isCancelled && response.effects?.length) {
                    setEffects(response.effects)
                }
            } catch {
                if (!isCancelled) {
                    setEffects(fallbackEffects)
                }
            }
        }

        loadEffects()

        return () => {
            isCancelled = true
        }
    }, [])

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
                    {effects.map((effect) => (
                        <EffectCard effect={effect} key={effect.id || effect.key} />
                    ))}
                </section>
            </div>
        </section>
    )
}

export function EffectCard({ effect, compact = false }) {
    const imageUrl = resolveEffectImage(effect.imageUrl)
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

function resolveEffectImage(value) {
    if (!value) return ''
    if (/^(https?:)?\/\//i.test(value) || value.startsWith('data:')) return value

    return `${getBaseUrl()}${value.startsWith('/') ? value : `/${value}`}`
}

export default EffectsPage
