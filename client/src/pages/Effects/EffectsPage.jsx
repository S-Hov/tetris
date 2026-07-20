import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import GlowEffect from '@/shared/ui/GlowEffect'
import { getLocalizedGamePath } from '@/i18n'
import { getLocalizedEffectText } from '@/features/tetris/effects/catalog.js'
import { useEffectCatalog } from '@/features/tetris/effects/useEffectCatalog.js'
import './EffectsPage.css'

const EffectsPage = () => {
    const { t } = useTranslation()
    const { effects, error, isLoading } = useEffectCatalog()

    return (
        <section className="section effects-page">
            <div className="container effects-container">
                <section className="effects-hero">
                    <GlowEffect>
                        <div className="glow-effect effects-hero__content">
                            <p className="effects-eyebrow">{t('effectsPage.hero.eyebrow')}</p>
                            <h1>{t('effectsPage.hero.title')}</h1>
                            <p>{t('effectsPage.hero.description')}</p>
                            <Link className="button effects-hero__button" to={getLocalizedGamePath('/game/1v1/ranked')}>
                                <i className="fas fa-play"></i>
                                {t('effectsPage.hero.playButton')}
                            </Link>
                        </div>
                    </GlowEffect>
                </section>

                <section className="effects-grid" aria-label={t('effectsPage.catalogAriaLabel')}>
                    {isLoading ? <p>{t('effectsPage.loading')}</p> : null}
                    {error ? <p>{t('effectsPage.error')}</p> : null}
                    {effects.map((effect) => (
                        <EffectCard effect={effect} key={effect.id || effect.key} />
                    ))}
                </section>
            </div>
        </section>
    )
}

export function EffectCard({ effect, compact = false }) {
    const { i18n, t } = useTranslation()
    const language = i18n.language === 'en' ? 'en' : 'ru'
    const localized = getLocalizedEffectText(effect, language)
    const imageUrl = effect.imageUrl || ''
    const label = localized.label
    const title = localized.title
    const description = localized.description
    const durationSeconds = Number(effect.durationMs) > 100
        ? t('effectsPage.duration.seconds', { count: Math.round(Number(effect.durationMs) / 1000) })
        : t('effectsPage.duration.instant')

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
