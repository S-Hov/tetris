import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

import { PIECES } from '@/features/tetris/model/pieces.js'
import { SPECIAL_PIECES } from '@/features/tetris/model/specialPieces.js'
import { cosmeticsAPI } from '@/shared/api/cosmetics'
import ProfileSideNav from '@/widgets/ProfileSideNav'

import '@/features/tetris/ui/TetrisBoard.css'
import './InventoryPage.css'

const STANDARD_PIECES = Object.values(PIECES)
const PROJECT_PIECES = Object.values(SPECIAL_PIECES)
const PACK_PREVIEW_PIECES = [PIECES.T, PIECES.I, PIECES.O, SPECIAL_PIECES.U]

const InventoryPage = () => {
    const { i18n, t } = useTranslation()
    const [items, setItems] = useState([])
    const [status, setStatus] = useState('loading')
    const [selectedInventoryItem, setSelectedInventoryItem] = useState(null)

    useEffect(() => {
        const controller = new AbortController()

        const loadInventory = async () => {
            setStatus('loading')

            try {
                const response = await cosmeticsAPI.getInventory({ signal: controller.signal })
                setItems(Array.isArray(response.items) ? response.items : [])
                setStatus('ready')
            } catch (error) {
                if (error?.name !== 'AbortError') {
                    setStatus('error')
                }
            }
        }

        loadInventory()

        return () => controller.abort()
    }, [])

    useEffect(() => {
        if (!selectedInventoryItem) return undefined

        const previousOverflow = document.body.style.overflow
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                setSelectedInventoryItem(null)
            }
        }

        document.body.style.overflow = 'hidden'
        window.addEventListener('keydown', handleKeyDown)

        return () => {
            document.body.style.overflow = previousOverflow
            window.removeEventListener('keydown', handleKeyDown)
        }
    }, [selectedInventoryItem])

    const isRussian = i18n.language !== 'en'

    return (
        <section className="section inventory-page">
            <Helmet>
                <title>{t('inventory.seoTitle')}</title>
                <meta name="description" content={t('inventory.seoDescription')} />
            </Helmet>

            <div className="container inventory-page__layout profile-layout-shell">
                <ProfileSideNav />

                <div className="inventory-page__content profile-layout-content">
                    <header className="inventory-page__hero">
                        <span>{t('inventory.eyebrow')}</span>
                        <h1>{t('inventory.title')}</h1>
                        <p>{t('inventory.description')}</p>
                    </header>

                    {status === 'loading' && (
                        <InventoryState icon="fas fa-circle-notch fa-spin" text={t('inventory.loading')} />
                    )}

                    {status === 'error' && (
                        <InventoryState icon="fas fa-triangle-exclamation" text={t('inventory.error')} />
                    )}

                    {status === 'ready' && items.length === 0 && (
                        <InventoryState icon="fas fa-box-open" text={t('inventory.empty')} />
                    )}

                    {status === 'ready' && items.length > 0 && (
                        <div className="inventory-page__grid">
                            {items.map((inventoryItem) => {
                                const item = inventoryItem.item || {}
                                const { description, label } = getLocalizedItem(item, isRussian)

                                return (
                                    <article
                                        className={`inventory-card ${inventoryItem.isEquipped ? 'inventory-card--active' : ''}`}
                                        key={inventoryItem.inventoryId}
                                    >
                                        <button
                                            aria-label={t('inventory.openPack', { name: label })}
                                            className="inventory-card__hit-target"
                                            onClick={() => setSelectedInventoryItem(inventoryItem)}
                                            type="button"
                                        />
                                        {inventoryItem.isEquipped && (
                                            <span className="inventory-card__active-mark" title={t('inventory.equipped')}>
                                                <i className="fas fa-check"></i>
                                            </span>
                                        )}

                                        <SkinPackArtwork />

                                        <div className="inventory-card__body">
                                            <div className="inventory-card__meta">
                                                <span>{t(`inventory.rarity.${item.rarity || 'common'}`)}</span>
                                                {inventoryItem.isEquipped && (
                                                    <strong>
                                                        <i className="fas fa-check"></i>
                                                        {t('inventory.equipped')}
                                                    </strong>
                                                )}
                                            </div>
                                            <h2>{label}</h2>
                                            <p>{description}</p>
                                            <small>
                                                <i className="fas fa-layer-group"></i>
                                                {t('inventory.skinPack')}
                                            </small>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    )}
                </div>
            </div>

            {selectedInventoryItem && (
                <SkinPackModal
                    inventoryItem={selectedInventoryItem}
                    isRussian={isRussian}
                    onClose={() => setSelectedInventoryItem(null)}
                    t={t}
                />
            )}
        </section>
    )
}

const SkinPackArtwork = () => (
    <div className="inventory-card__preview" aria-hidden="true">
        <div className="inventory-card__pack-art">
            {PACK_PREVIEW_PIECES.map((piece) => (
                <PieceShape compact key={piece.type} piece={piece} />
            ))}
        </div>
        <span className="inventory-card__pack-icon"><i className="fas fa-layer-group"></i></span>
    </div>
)

const SkinPackModal = ({ inventoryItem, isRussian, onClose, t }) => {
    const item = inventoryItem.item || {}
    const { description, label } = getLocalizedItem(item, isRussian)

    const handleBackdropClick = (event) => {
        if (event.target === event.currentTarget) onClose()
    }

    return (
        <div className="inventory-modal" onMouseDown={handleBackdropClick} role="presentation">
            <section
                aria-labelledby="inventory-pack-modal-title"
                aria-modal="true"
                className="inventory-modal__dialog"
                role="dialog"
            >
                <header className="inventory-modal__header">
                    <div>
                        <span>{t('inventory.modal.eyebrow')}</span>
                        <h2 id="inventory-pack-modal-title">{label}</h2>
                        <p>{description}</p>
                    </div>
                    <button
                        aria-label={t('inventory.modal.close')}
                        autoFocus
                        className="inventory-modal__close"
                        onClick={onClose}
                        type="button"
                    >
                        <i className="fas fa-xmark"></i>
                    </button>
                </header>

                <div className="inventory-modal__summary">
                    <span><i className="fas fa-shapes"></i>{t('inventory.modal.total', { count: STANDARD_PIECES.length + PROJECT_PIECES.length })}</span>
                    {inventoryItem.isEquipped && (
                        <strong><i className="fas fa-check"></i>{t('inventory.equipped')}</strong>
                    )}
                </div>

                <PieceCollection
                    pieces={STANDARD_PIECES}
                    subtitle={t('inventory.modal.standardDescription')}
                    title={t('inventory.modal.standard', { count: STANDARD_PIECES.length })}
                />
                <PieceCollection
                    pieces={PROJECT_PIECES}
                    subtitle={t('inventory.modal.specialDescription')}
                    title={t('inventory.modal.special', { count: PROJECT_PIECES.length })}
                />
            </section>
        </div>
    )
}

const PieceCollection = ({ pieces, subtitle, title }) => (
    <section className="inventory-piece-section">
        <div className="inventory-piece-section__header">
            <h3>{title}</h3>
            <p>{subtitle}</p>
        </div>
        <div className="inventory-piece-grid">
            {pieces.map((piece) => (
                <article className="inventory-piece-card" key={piece.type}>
                    <div className="inventory-piece-card__visual">
                        <PieceShape piece={piece} />
                    </div>
                    <strong>{piece.type}</strong>
                </article>
            ))}
        </div>
    </section>
)

const PieceShape = ({ compact = false, piece }) => (
    <div
        className={`inventory-piece-shape ${compact ? 'inventory-piece-shape--compact' : ''}`}
        style={{
            '--piece-columns': piece.shape[0].length,
            '--piece-rows': piece.shape.length,
        }}
    >
        {piece.shape.flatMap((row, rowIndex) => row.map((cell, columnIndex) => (
            cell
                ? <span className={`tetris-cell cell--${piece.type} filled inventory-piece-shape__cell`} key={`${rowIndex}-${columnIndex}`} />
                : <span className="inventory-piece-shape__cell inventory-piece-shape__cell--empty" key={`${rowIndex}-${columnIndex}`} />
        )))}
    </div>
)

const getLocalizedItem = (item, isRussian) => ({
    label: isRussian ? item.labelRu || item.label : item.label,
    description: isRussian ? item.descriptionRu || item.description : item.description,
})

const InventoryState = ({ icon, text }) => (
    <div className="inventory-page__state">
        <i className={icon}></i>
        <p>{text}</p>
    </div>
)

export default InventoryPage
