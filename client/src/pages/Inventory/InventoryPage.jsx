import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

import { PIECES } from '@/features/tetris/model/pieces.js'
import { SPECIAL_PIECES } from '@/features/tetris/model/specialPieces.js'
import SkinCellLayers from '@/features/tetris/skins/SkinCellLayers.jsx'
import { cosmeticsAPI } from '@/shared/api/cosmetics'
import { useAuth } from '@/shared/hooks/useAuth.js'
import ProfileSideNav from '@/widgets/ProfileSideNav'
import notify from '@/utils/Notifications'

import '@/features/tetris/ui/TetrisBoard.css'
import '@/features/tetris/skins/skinPresets.css'
import './InventoryPage.css'

const STANDARD_PIECES = Object.values(PIECES)
const PROJECT_PIECES = Object.values(SPECIAL_PIECES)
const PACK_PREVIEW_PIECES = [PIECES.T, PIECES.I, PIECES.O, SPECIAL_PIECES.U]

const InventoryPage = () => {
    const { i18n, t } = useTranslation()
    const { user } = useAuth()
    const [items, setItems] = useState([])
    const [catalogItems, setCatalogItems] = useState([])
    const [status, setStatus] = useState('loading')
    const [selectedInventoryItem, setSelectedInventoryItem] = useState(null)
    const [equippingInventoryId, setEquippingInventoryId] = useState(null)
    const isAdmin = user?.role === 'admin'

    useEffect(() => {
        const controller = new AbortController()

        const loadInventory = async () => {
            setStatus('loading')

            try {
                const [inventoryResponse, catalogResponse] = await Promise.all([
                    cosmeticsAPI.getInventory({ signal: controller.signal }),
                    isAdmin
                        ? cosmeticsAPI.getAdminCatalog({ signal: controller.signal })
                        : Promise.resolve({ items: [] }),
                ])

                setItems(Array.isArray(inventoryResponse.items) ? inventoryResponse.items : [])
                setCatalogItems(Array.isArray(catalogResponse.items) ? catalogResponse.items : [])
                setStatus('ready')
            } catch (error) {
                if (error?.name !== 'AbortError') {
                    setStatus('error')
                }
            }
        }

        loadInventory()

        return () => controller.abort()
    }, [isAdmin])

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

    const handleOpenPack = (inventoryItem) => {
        setSelectedInventoryItem(inventoryItem)

        if (inventoryItem.isAdminCatalogItem || !inventoryItem.isNew) return

        setItems((currentItems) => currentItems.map((currentItem) => (
            currentItem.inventoryId === inventoryItem.inventoryId
                ? { ...currentItem, isNew: false }
                : currentItem
        )))

        cosmeticsAPI.markViewed(inventoryItem.inventoryId).catch(() => {
            setItems((currentItems) => currentItems.map((currentItem) => (
                currentItem.inventoryId === inventoryItem.inventoryId
                    ? { ...currentItem, isNew: true }
                    : currentItem
            )))
        })
    }

    const handleEquipPack = async (inventoryItem) => {
        if (inventoryItem.isEquipped || equippingInventoryId) return

        const itemIdentifier = getInventoryItemIdentifier(inventoryItem)
        setEquippingInventoryId(itemIdentifier)

        try {
            if (inventoryItem.isAdminCatalogItem) {
                await cosmeticsAPI.equipAdminPreview(inventoryItem.catalogItemId)
                setCatalogItems((currentItems) => currentItems.map((currentItem) => ({
                    ...currentItem,
                    isEquipped: currentItem.catalogItemId === inventoryItem.catalogItemId,
                })))
                setItems((currentItems) => currentItems.map((currentItem) => ({
                    ...currentItem,
                    isEquipped: false,
                })))
            } else {
                await cosmeticsAPI.equipSkinPack(inventoryItem.inventoryId)
                setItems((currentItems) => currentItems.map((currentItem) => ({
                    ...currentItem,
                    isEquipped: currentItem.inventoryId === inventoryItem.inventoryId,
                })))
                setCatalogItems((currentItems) => currentItems.map((currentItem) => ({
                    ...currentItem,
                    isEquipped: false,
                })))
            }

            setSelectedInventoryItem((currentItem) => currentItem
                ? { ...currentItem, isEquipped: true }
                : currentItem)
            notify(t(inventoryItem.isAdminCatalogItem
                ? 'inventory.notifications.adminPreviewEquipped'
                : 'inventory.notifications.equipped'), 'success')
        } catch (error) {
            notify(error.message || t('inventory.notifications.equipError'), 'error')
        } finally {
            setEquippingInventoryId(null)
        }
    }

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

                    {status === 'ready' && items.length === 0 && catalogItems.length === 0 && (
                        <InventoryState icon="fas fa-box-open" text={t('inventory.empty')} />
                    )}

                    {status === 'ready' && items.length > 0 && (
                        <InventorySection
                            description={isAdmin ? t('inventory.earnedDescriptionAdmin') : null}
                            isRussian={isRussian}
                            items={items}
                            onOpen={handleOpenPack}
                            t={t}
                            title={isAdmin ? t('inventory.earnedTitle') : null}
                        />
                    )}

                    {status === 'ready' && isAdmin && (
                        <InventorySection
                            adminCatalog
                            description={t('inventory.adminCatalogDescription')}
                            isRussian={isRussian}
                            items={catalogItems}
                            onOpen={handleOpenPack}
                            t={t}
                            title={t('inventory.adminCatalogTitle')}
                        />
                    )}
                </div>
            </div>

            {selectedInventoryItem && (
                <SkinPackModal
                    inventoryItem={selectedInventoryItem}
                    isEquipping={equippingInventoryId === getInventoryItemIdentifier(selectedInventoryItem)}
                    isRussian={isRussian}
                    onClose={() => setSelectedInventoryItem(null)}
                    onEquip={handleEquipPack}
                    t={t}
                />
            )}
        </section>
    )
}

const InventorySection = ({ adminCatalog = false, description, isRussian, items, onOpen, t, title }) => (
    <section className={`inventory-section ${adminCatalog ? 'inventory-section--admin' : ''}`}>
        {title && (
            <header className="inventory-section__header">
                <span>{adminCatalog ? t('inventory.adminCatalogEyebrow') : t('inventory.earnedEyebrow')}</span>
                <h2>{title}</h2>
                {description ? <p>{description}</p> : null}
            </header>
        )}

        {items.length > 0 ? (
            <div className="inventory-page__grid">
                {items.map((inventoryItem) => {
                    const item = inventoryItem.item || {}
                    const { description: itemDescription, label } = getLocalizedItem(item, isRussian)

                    return (
                        <article
                            className={`inventory-card inventory-card--rarity-${item.rarity || 'common'} ${inventoryItem.isEquipped ? 'inventory-card--active' : ''} ${adminCatalog ? 'inventory-card--admin-catalog' : ''}`}
                            key={getInventoryItemIdentifier(inventoryItem)}
                        >
                            <button
                                aria-label={t('inventory.openPack', { name: label })}
                                className="inventory-card__hit-target"
                                onClick={() => onOpen(inventoryItem)}
                                type="button"
                            />
                            {inventoryItem.isNew && (
                                <span className="inventory-card__new-mark">{t('inventory.new')}</span>
                            )}
                            {adminCatalog && inventoryItem.isOwned && (
                                <span className="inventory-card__owned-mark">{t('inventory.owned')}</span>
                            )}
                            {inventoryItem.isEquipped && (
                                <span className="inventory-card__active-mark" title={t(adminCatalog ? 'inventory.adminPreviewActive' : 'inventory.equipped')}>
                                    <i className={adminCatalog ? 'fas fa-flask' : 'fas fa-check'}></i>
                                </span>
                            )}

                            <SkinPackArtwork skinKey={getInventorySkinPreset(inventoryItem)} />

                            <div className="inventory-card__body">
                                <div className="inventory-card__meta">
                                    <span>{t(`inventory.rarity.${item.rarity || 'common'}`)}</span>
                                    {inventoryItem.isEquipped && (
                                        <strong>
                                            <i className={adminCatalog ? 'fas fa-flask' : 'fas fa-check'}></i>
                                            {t(adminCatalog ? 'inventory.testing' : 'inventory.equipped')}
                                        </strong>
                                    )}
                                </div>
                                <h2>{label}</h2>
                                <p>{itemDescription}</p>
                                <small>
                                    <i className={adminCatalog ? 'fas fa-shield-halved' : 'fas fa-layer-group'}></i>
                                    {t(adminCatalog ? 'inventory.adminCatalogItem' : 'inventory.skinPack')}
                                </small>
                            </div>
                        </article>
                    )
                })}
            </div>
        ) : (
            <InventoryState icon="fas fa-box-open" text={t('inventory.adminCatalogEmpty')} />
        )}
    </section>
)

const SkinPackArtwork = ({ skinKey }) => (
    <div className={`inventory-card__preview ${getSkinClassName(skinKey)}`} aria-hidden="true">
        <div className="inventory-card__pack-art">
            {PACK_PREVIEW_PIECES.map((piece) => (
                <PieceShape compact key={piece.type} piece={piece} skinKey={skinKey} />
            ))}
        </div>
        <span className="inventory-card__pack-icon"><i className="fas fa-layer-group"></i></span>
    </div>
)

const SkinPackModal = ({ inventoryItem, isEquipping, isRussian, onClose, onEquip, t }) => {
    const item = inventoryItem.item || {}
    const skinPreset = getInventorySkinPreset(inventoryItem)
    const isAdminCatalogItem = Boolean(inventoryItem.isAdminCatalogItem)
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
                        <strong>
                            <i className={isAdminCatalogItem ? 'fas fa-flask' : 'fas fa-check'}></i>
                            {t(isAdminCatalogItem ? 'inventory.testing' : 'inventory.equipped')}
                        </strong>
                    )}
                </div>

                <div className="inventory-modal__actions">
                    <div className="inventory-modal__acquisition">
                        <i className={isAdminCatalogItem ? 'fas fa-shield-halved' : 'fas fa-gift'}></i>
                        <span>
                            <small>{t(isAdminCatalogItem ? 'inventory.modal.adminAccess' : 'inventory.modal.receivedFor')}</small>
                            <strong>{isAdminCatalogItem
                                ? t('inventory.modal.adminAccessDescription')
                                : getAcquisitionReason(inventoryItem, t)}</strong>
                        </span>
                    </div>
                    <button
                        className={`inventory-modal__equip ${inventoryItem.isEquipped ? 'inventory-modal__equip--active' : ''}`}
                        disabled={inventoryItem.isEquipped || isEquipping}
                        onClick={() => onEquip(inventoryItem)}
                        type="button"
                    >
                        <i className={inventoryItem.isEquipped
                            ? isAdminCatalogItem ? 'fas fa-flask' : 'fas fa-check'
                            : isAdminCatalogItem ? 'fas fa-vial' : 'fas fa-shirt'}></i>
                        {inventoryItem.isEquipped
                            ? t(isAdminCatalogItem ? 'inventory.modal.adminPreviewSelected' : 'inventory.modal.selected')
                            : isEquipping
                                ? t('inventory.modal.selecting')
                                : t(isAdminCatalogItem ? 'inventory.modal.adminPreviewSelect' : 'inventory.modal.select')}
                    </button>
                </div>

                <PieceCollection
                    pieces={STANDARD_PIECES}
                    skinKey={skinPreset}
                    subtitle={t('inventory.modal.standardDescription')}
                    title={t('inventory.modal.standard', { count: STANDARD_PIECES.length })}
                />
                <PieceCollection
                    pieces={PROJECT_PIECES}
                    skinKey={skinPreset}
                    subtitle={t('inventory.modal.specialDescription')}
                    title={t('inventory.modal.special', { count: PROJECT_PIECES.length })}
                />
            </section>
        </div>
    )
}

const PieceCollection = ({ pieces, skinKey, subtitle, title }) => (
    <section className="inventory-piece-section">
        <div className="inventory-piece-section__header">
            <h3>{title}</h3>
            <p>{subtitle}</p>
        </div>
        <div className="inventory-piece-grid">
            {pieces.map((piece) => (
                <article className="inventory-piece-card" key={piece.type}>
                    <div className="inventory-piece-card__visual">
                        <PieceShape piece={piece} skinKey={skinKey} />
                    </div>
                    <strong>{piece.type}</strong>
                </article>
            ))}
        </div>
    </section>
)

const PieceShape = ({ compact = false, piece, skinKey }) => (
    <div
        className={`inventory-piece-shape ${compact ? 'inventory-piece-shape--compact' : ''} ${getSkinClassName(skinKey)}`}
        style={{
            '--piece-columns': piece.shape[0].length,
            '--piece-rows': piece.shape.length,
        }}
    >
        {piece.shape.flatMap((row, rowIndex) => row.map((cell, columnIndex) => (
            cell
                ? (
                    <span className={`tetris-cell cell--${piece.type} filled inventory-piece-shape__cell`} key={`${rowIndex}-${columnIndex}`}>
                        <SkinCellLayers />
                    </span>
                )
                : <span className="inventory-piece-shape__cell inventory-piece-shape__cell--empty" key={`${rowIndex}-${columnIndex}`} />
        )))}
    </div>
)

const getLocalizedItem = (item, isRussian) => ({
    label: isRussian ? item.labelRu || item.label : item.label,
    description: isRussian ? item.descriptionRu || item.description : item.description,
})

const getSkinClassName = (skinKey) => `inventory-skin--${String(skinKey || 'default').replaceAll('_', '-')}`

const getInventorySkinPreset = (inventoryItem) => (
    inventoryItem?.manifest?.data?.preset
    || inventoryItem?.item?.metadata?.cssPreset
    || inventoryItem?.item?.key
    || 'default'
)

const getInventoryItemIdentifier = (inventoryItem) => (
    inventoryItem?.isAdminCatalogItem
        ? `catalog-${inventoryItem.catalogItemId}`
        : `inventory-${inventoryItem?.inventoryId}`
)

const getAcquisitionReason = (inventoryItem, t) => {
    const reasonBySourceRef = {
        'default-skin': 'inventory.acquisition.default',
        'registration-gift-v1': 'inventory.acquisition.registration',
        'first-friend-reward': 'inventory.acquisition.firstFriend',
        'three-friends-reward': 'inventory.acquisition.threeFriends',
        'five-friends-reward': 'inventory.acquisition.fiveFriends',
        'ten-friends-reward': 'inventory.acquisition.tenFriends',
        'first-match-reward': 'inventory.acquisition.firstMatch',
        'five-matches-reward': 'inventory.acquisition.fiveMatches',
        'ten-matches-reward': 'inventory.acquisition.tenMatches',
        'hundred-matches-reward': 'inventory.acquisition.hundredMatches',
        'thousand-matches-reward': 'inventory.acquisition.thousandMatches',
        'five-thousand-matches-reward': 'inventory.acquisition.fiveThousandMatches',
        'ten-thousand-matches-reward': 'inventory.acquisition.tenThousandMatches',
    }
    const sourceKey = reasonBySourceRef[inventoryItem.sourceRef]

    if (sourceKey) return t(sourceKey)

    return t(`inventory.acquisition.${inventoryItem.source || 'system'}`)
}

const InventoryState = ({ icon, text }) => (
    <div className="inventory-page__state">
        <i className={icon}></i>
        <p>{text}</p>
    </div>
)

export default InventoryPage
