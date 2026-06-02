import { useTranslation } from 'react-i18next'

import GlowEffect from '@/shared/ui/GlowEffect'

import { supportCards } from './supportHelp.data.js'

import './SupportHelp.css'

const SupportHelp = () => {
    const { t } = useTranslation()
    const localizedSupportCards = supportCards.map((card) => ({
        ...card,
        title: t(`support.cards.${card.key}.title`),
        text: t(`support.cards.${card.key}.text`),
    }))

    return (
        <section className="support-help">
            <h2>
                <i className="fas fa-star"></i>
                {t('support.help.title')}
            </h2>

            <div className="support-cards" aria-label={t('support.help.ariaLabel')}>
                {localizedSupportCards.map((card) => (
                    <GlowEffect key={card.title}>
                        <article className={`glow-effect support-card support-card--${card.tone}`}>
                            <i className={card.icon}></i>
                            <div>
                                <h3>{card.title}</h3>
                                <p>{card.text}</p>
                            </div>
                        </article>
                    </GlowEffect>
                ))}
            </div>
        </section>
    )
}

export default SupportHelp
