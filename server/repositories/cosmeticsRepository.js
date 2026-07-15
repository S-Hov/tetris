import { pool } from '../db/index.js'

const mapInventoryItem = (row) => ({
    inventoryId: row.inventory_id,
    status: row.inventory_status,
    source: row.source,
    acquiredAt: row.acquired_at,
    isEquipped: row.is_equipped,
    item: {
        id: row.cosmetic_item_id,
        key: row.item_key,
        type: row.type,
        rarity: row.rarity,
        label: row.label,
        labelRu: row.label_ru,
        description: row.description,
        descriptionRu: row.description_ru,
        previewUrl: row.preview_url,
        metadata: row.item_metadata,
        collection: row.collection_id
            ? {
                id: row.collection_id,
                key: row.collection_key,
                label: row.collection_label,
                labelRu: row.collection_label_ru,
            }
            : null,
    },
    manifest: row.manifest_id
        ? {
            version: row.manifest_version,
            data: row.manifest,
        }
        : null,
})

export const getUserCosmeticInventoryRepo = async (userId) => {
    const result = await pool.query(
        `
        SELECT
            inventory.id AS inventory_id,
            inventory.status AS inventory_status,
            inventory.source,
            inventory.acquired_at,
            item.id AS cosmetic_item_id,
            item.item_key,
            item.type,
            item.rarity,
            item.label,
            item.label_ru,
            item.description,
            item.description_ru,
            item.preview_url,
            item.metadata AS item_metadata,
            collection.id AS collection_id,
            collection.collection_key,
            collection.label AS collection_label,
            collection.label_ru AS collection_label_ru,
            active_manifest.id AS manifest_id,
            active_manifest.version AS manifest_version,
            active_manifest.manifest,
            (
                loadout.active_skin_pack_inventory_id = inventory.id
                OR loadout.active_board_skin_inventory_id = inventory.id
                OR loadout.active_piece_skin_inventory_id = inventory.id
            ) AS is_equipped
        FROM user_inventory_items AS inventory
        JOIN cosmetic_items AS item
            ON item.id = inventory.cosmetic_item_id
        LEFT JOIN cosmetic_collections AS collection
            ON collection.id = item.collection_id
        LEFT JOIN skin_pack_manifests AS active_manifest
            ON active_manifest.cosmetic_item_id = item.id
            AND active_manifest.status = 'active'
        LEFT JOIN user_cosmetic_loadouts AS loadout
            ON loadout.user_id = inventory.user_id
        WHERE inventory.user_id = $1
            AND inventory.status IN ('active', 'locked')
            AND item.status = 'active'
        ORDER BY item.sort_order, inventory.acquired_at, inventory.id
        `,
        [userId]
    )

    return result.rows.map(mapInventoryItem)
}
