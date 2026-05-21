import { pool } from '../db/index.js'

export const FALLBACK_GAME_EFFECTS = [
    { id: 'speed_x2_for_4s', effect_key: 'speed_x2_for_4s', label: 'Overclock', label_ru: 'Перегрузка', title: 'Speed Surge', title_ru: 'Ускорение', description: 'Opponent pieces fall much faster for a short time.', description_ru: 'Фигуры соперника на короткое время начинают падать заметно быстрее.', icon: 'fa-gauge-high', image_url: null, visual: 'speed', duration_ms: 4000, status: 'active', sort_order: 10 },
    { id: 'darkness', effect_key: 'darkness', label: 'Blackout', label_ru: 'Затемнение', title: 'Darkness', title_ru: 'Тьма', description: 'Covers most of the opponent board with a dark veil.', description_ru: 'Почти всё поле соперника накрывает тёмная пелена.', icon: 'fa-moon', image_url: null, visual: 'darkness', duration_ms: 10000, status: 'active', sort_order: 20 },
    { id: 'garbage_rain', effect_key: 'garbage_rain', label: 'Garbage Rain', label_ru: 'Мусорный дождь', title: 'Random Blocks', title_ru: 'Случайные блоки', description: 'Drops a few messy blocks into the opponent board.', description_ru: 'На поле соперника падают лишние случайные блоки.', icon: 'fa-cubes', image_url: null, visual: 'garbage', duration_ms: 1, status: 'active', sort_order: 30 },
    { id: 'controls_swap', effect_key: 'controls_swap', label: 'Input Scramble', label_ru: 'Сбой управления', title: 'Swapped Controls', title_ru: 'Перепутанные кнопки', description: 'Temporarily reverses the opponent movement controls.', description_ru: 'На время меняет местами управление движением у соперника.', icon: 'fa-shuffle', image_url: null, visual: 'controls', duration_ms: 5000, status: 'active', sort_order: 40 },
    { id: 'fog_piece', effect_key: 'fog_piece', label: 'Blind Next', label_ru: 'Слепая следующая', title: 'Hidden Preview', title_ru: 'Скрытый предпросмотр', description: 'Hides the opponent next piece preview.', description_ru: 'Прячет у соперника окно со следующей фигурой.', icon: 'fa-eye-slash', image_url: null, visual: 'fog', duration_ms: 6000, status: 'active', sort_order: 50 },
    { id: 'gravity_lock', effect_key: 'gravity_lock', label: 'Heavy Gravity', label_ru: 'Тяжёлая гравитация', title: 'Sticky Drop', title_ru: 'Липкое падение', description: 'Makes soft correction harder after a piece starts falling.', description_ru: 'Мешает корректировать фигуру после начала падения.', icon: 'fa-weight-hanging', image_url: null, visual: 'gravity', duration_ms: 3500, status: 'active', sort_order: 60 },
    { id: 'screen_shake', effect_key: 'screen_shake', label: 'Quake', label_ru: 'Тряска', title: 'Screen Shake', title_ru: 'Дрожание экрана', description: 'Makes the opponent board jitter for a short burst.', description_ru: 'Поле соперника начинает сильно дрожать несколько секунд.', icon: 'fa-wave-square', image_url: null, visual: 'shake', duration_ms: 3500, status: 'active', sort_order: 70 },
    { id: 'random_rotation', effect_key: 'random_rotation', label: 'Spin Glitch', label_ru: 'Глюк вращения', title: 'Random Rotation', title_ru: 'Случайный поворот', description: 'Occasionally rotates the opponent piece on its own.', description_ru: 'Фигура соперника время от времени сама поворачивается.', icon: 'fa-rotate', image_url: null, visual: 'rotation', duration_ms: 5000, status: 'active', sort_order: 80 },
    { id: 'sticky_walls', effect_key: 'sticky_walls', label: 'Wall Glue', label_ru: 'Клейкие стены', title: 'Sticky Walls', title_ru: 'Залипание у стен', description: 'Locks horizontal movement when the opponent touches a wall.', description_ru: 'Если фигура касается стены, двигать её вбок становится сложнее.', icon: 'fa-grip-lines-vertical', image_url: null, visual: 'sticky', duration_ms: 5000, status: 'active', sort_order: 90 },
    { id: 'delay_input', effect_key: 'delay_input', label: 'Lag Spike', label_ru: 'Лаг-спайк', title: 'Delayed Input', title_ru: 'Задержка ввода', description: 'Applies opponent controls with a small delay.', description_ru: 'Все нажатия соперника выполняются с небольшой задержкой.', icon: 'fa-hourglass-half', image_url: null, visual: 'delay', duration_ms: 5000, status: 'active', sort_order: 100 },
    { id: 'invisible_cells', effect_key: 'invisible_cells', label: 'Ghost Blocks', label_ru: 'Призрачные блоки', title: 'Invisible Cells', title_ru: 'Невидимые клетки', description: 'Makes some locked blocks visually disappear.', description_ru: 'Часть уже поставленных блоков на поле становится невидимой.', icon: 'fa-eye-low-vision', image_url: null, visual: 'invisible', duration_ms: 6000, status: 'active', sort_order: 110 },
]

export async function getActiveGameEffectsRepo() {
    try {
        const { rows } = await pool.query(
            `
            SELECT id, effect_key, label, label_ru, title, title_ru, description, description_ru, icon, image_url, visual, duration_ms, status, sort_order
            FROM game_effects
            WHERE status = 'active'
            ORDER BY sort_order ASC, id ASC
            `
        )

        return rows.length > 0 ? rows : FALLBACK_GAME_EFFECTS
    } catch (error) {
        if (error.code === '42P01') {
            return FALLBACK_GAME_EFFECTS
        }

        throw error
    }
}

export async function getActiveGameEffectByKeyRepo(effectKey) {
    const effects = await getActiveGameEffectsRepo()

    return effects.find((effect) => effect.effect_key === effectKey) || null
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
        sortOrder: Number(effect.sort_order) || 0,
    }
}
