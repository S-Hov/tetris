import { pool } from '../db/index.js'

export async function getActiveGameEffectsRepo() {
    const { rows } = await pool.query(
        `
        SELECT id, effect_key, label, label_ru, title, title_ru, description, description_ru,
            icon, image_url, visual, duration_ms, status, sort_order, metadata
        FROM game_effects
        WHERE status = 'active'
        ORDER BY sort_order ASC, id ASC
        `
    )

    return rows
}

export async function getActiveGameEffectByKeyRepo(effectKey) {
    const { rows } = await pool.query(
        `
        SELECT id, effect_key, label, label_ru, title, title_ru, description, description_ru,
            icon, image_url, visual, duration_ms, status, sort_order, metadata
        FROM game_effects
        WHERE effect_key = $1 AND status = 'active'
        LIMIT 1
        `,
        [effectKey]
    )

    return rows[0] || null
}

export function toClientEffect(effect) {
    return {
        id: effect.effect_key,
        key: effect.effect_key,
        label: effect.label,
        labelRu: effect.label_ru,
        title: effect.title,
        titleRu: effect.title_ru,
        description: effect.description,
        descriptionRu: effect.description_ru,
        icon: effect.icon,
        imageUrl: effect.image_url,
        visual: effect.visual,
        enabled: effect.status === 'active',
        durationMs: Number(effect.duration_ms) || 0,
        parameters: effect.metadata && typeof effect.metadata === 'object'
            ? effect.metadata
            : {},
        sortOrder: Number(effect.sort_order) || 0,
    }
}
