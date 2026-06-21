import assert from 'node:assert/strict'
import test from 'node:test'

import { toClientEffect } from '../repositories/gameEffectsRepository.js'

test('game effect database rows expose the normalized client contract', () => {
    assert.deepEqual(toClientEffect({
        effect_key: 'darkness',
        label: 'Blackout',
        label_ru: 'Затемнение',
        title: 'Darkness',
        title_ru: 'Тьма',
        description: 'Description',
        description_ru: 'Описание',
        icon: 'fa-moon',
        image_url: '/uploads/effects/darkness.webp',
        visual: 'darkness',
        duration_ms: 10000,
        status: 'active',
        sort_order: 20,
        metadata: {
            opacity: 0.8,
        },
    }), {
        id: 'darkness',
        key: 'darkness',
        label: 'Blackout',
        labelRu: 'Затемнение',
        title: 'Darkness',
        titleRu: 'Тьма',
        description: 'Description',
        descriptionRu: 'Описание',
        icon: 'fa-moon',
        imageUrl: '/uploads/effects/darkness.webp',
        visual: 'darkness',
        enabled: true,
        durationMs: 10000,
        parameters: {
            opacity: 0.8,
        },
        sortOrder: 20,
    })
})
