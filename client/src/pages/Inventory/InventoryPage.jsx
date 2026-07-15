import { useEffect, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'

import { cosmeticsAPI } from '@/shared/api/cosmetics'
import ProfileSideNav from '@/widgets/ProfileSideNav'

import './InventoryPage.css'

const PREVIEW_CELLS = [
    '', '', 'T', '', '', '', '', '',
    '', 'T', 'T', 'T', '', '', '', '',
    '', '', 'I', '', '', 'O', 'O', '',
    'L', '', 'I', 'S', 'S', 'O', 'O', '',
    'L', '', 'I', 'S', 'Z', 'Z', '', '',
    'L', 'L', 'I', '', '', 'Z', 'Z', '',
]

const InventoryPage = () => {
    const { i18n, t } = useTranslation()
    const [items, setItems] = useState([])
    const [status, setStatus] = useState('loading')

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
                                const label = isRussian ? item.labelRu || item.label : item.label
                                const description = isRussian
                                    ? item.descriptionRu || item.description
                                    : item.description

                                return (
                                    <article className="inventory-card" key={inventoryItem.inventoryId}>
                                        <SkinPreview />

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
        </section>
    )
}

const SkinPreview = () => (
    <div className="inventory-card__preview" aria-hidden="true">
        <div className="inventory-card__board">
            {PREVIEW_CELLS.map((piece, index) => (
                <span
                    className={piece ? `inventory-card__cell inventory-card__cell--${piece}` : 'inventory-card__cell'}
                    key={index}
                />
            ))}
        </div>
    </div>
)

const InventoryState = ({ icon, text }) => (
    <div className="inventory-page__state">
        <i className={icon}></i>
        <p>{text}</p>
    </div>
)

export default InventoryPage
