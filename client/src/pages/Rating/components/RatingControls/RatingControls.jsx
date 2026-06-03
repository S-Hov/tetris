import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import GlowEffect from '@/shared/ui/GlowEffect'

import { sortOptionsMeta } from './ratingControls.data.js'

import './RatingControls.css'

const RatingControls = ({ sort, onSortChange }) => {
    const { t } = useTranslation()
    const sortOptions = useMemo(() => sortOptionsMeta.map((option) => ({
        ...option,
        label: t(`rating.sort.${option.key}`),
    })), [t])

    return (
        <section className="rating-controls-card">
            <GlowEffect>
                <div className="glow-effect rating-controls">
                    <div className="rating-control-group" aria-label={t('rating.controls.systemAria')}>
                        <span className="rating-chip rating-chip--active">
                            <i className="fas fa-trophy"></i>
                            {t('rating.controls.season')}
                        </span>
                    </div>

                    <div className="rating-sort-panel" aria-label={t('rating.controls.sortAria')}>
                        <span>{t('rating.controls.sortLabel')}</span>
                        <div>
                            {sortOptions.map((option) => (
                                <button
                                    key={option.key}
                                    type="button"
                                    className={`rating-sort-button ${sort === option.key ? 'rating-sort-button--active' : ''}`}
                                    onClick={() => onSortChange(option.key)}
                                    title={option.label}
                                >
                                    <i className={option.icon}></i>
                                    <span>{option.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </GlowEffect>
        </section>
    )
}

export default RatingControls
