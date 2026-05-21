CREATE TABLE IF NOT EXISTS game_effects (
    id BIGSERIAL PRIMARY KEY,
    effect_key TEXT NOT NULL UNIQUE,
    label TEXT NOT NULL,
    label_ru TEXT NOT NULL,
    title TEXT NOT NULL,
    title_ru TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    description_ru TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT '',
    image_url TEXT,
    visual TEXT NOT NULL DEFAULT 'default',
    duration_ms INTEGER NOT NULL DEFAULT 4000 CHECK (duration_ms >= 0),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_game_effects_status_sort
    ON game_effects (status, sort_order, id);

INSERT INTO game_effects (
    effect_key,
    label,
    label_ru,
    title,
    title_ru,
    description,
    description_ru,
    icon,
    image_url,
    visual,
    duration_ms,
    status,
    sort_order
) VALUES
    ('speed_x2_for_4s', 'Overclock', 'Перегрузка', 'Speed Surge', 'Ускорение', 'Opponent pieces fall much faster for a short time.', 'Фигуры соперника на короткое время начинают падать заметно быстрее.', 'fa-gauge-high', NULL, 'speed', 4000, 'active', 10),
    ('darkness', 'Blackout', 'Затемнение', 'Darkness', 'Тьма', 'Covers most of the opponent board with a dark veil.', 'Почти всё поле соперника накрывает тёмная пелена.', 'fa-moon', NULL, 'darkness', 10000, 'active', 20),
    ('garbage_rain', 'Garbage Rain', 'Мусорный дождь', 'Random Blocks', 'Случайные блоки', 'Drops a few messy blocks into the opponent board.', 'На поле соперника падают лишние случайные блоки.', 'fa-cubes', NULL, 'garbage', 1, 'active', 30),
    ('controls_swap', 'Input Scramble', 'Сбой управления', 'Swapped Controls', 'Перепутанные кнопки', 'Temporarily reverses the opponent movement controls.', 'На время меняет местами управление движением у соперника.', 'fa-shuffle', NULL, 'controls', 5000, 'active', 40),
    ('fog_piece', 'Blind Next', 'Слепая следующая', 'Hidden Preview', 'Скрытый предпросмотр', 'Hides the opponent next piece preview.', 'Прячет у соперника окно со следующей фигурой.', 'fa-eye-slash', NULL, 'fog', 6000, 'active', 50),
    ('gravity_lock', 'Heavy Gravity', 'Тяжёлая гравитация', 'Sticky Drop', 'Липкое падение', 'Makes soft correction harder after a piece starts falling.', 'Мешает корректировать фигуру после начала падения.', 'fa-weight-hanging', NULL, 'gravity', 3500, 'active', 60),
    ('screen_shake', 'Quake', 'Тряска', 'Screen Shake', 'Дрожание экрана', 'Makes the opponent board jitter for a short burst.', 'Поле соперника начинает сильно дрожать несколько секунд.', 'fa-wave-square', NULL, 'shake', 3500, 'active', 70),
    ('random_rotation', 'Spin Glitch', 'Глюк вращения', 'Random Rotation', 'Случайный поворот', 'Occasionally rotates the opponent piece on its own.', 'Фигура соперника время от времени сама поворачивается.', 'fa-rotate', NULL, 'rotation', 5000, 'active', 80),
    ('sticky_walls', 'Wall Glue', 'Клейкие стены', 'Sticky Walls', 'Залипание у стен', 'Locks horizontal movement when the opponent touches a wall.', 'Если фигура касается стены, двигать её вбок становится сложнее.', 'fa-grip-lines-vertical', NULL, 'sticky', 5000, 'active', 90),
    ('delay_input', 'Lag Spike', 'Лаг-спайк', 'Delayed Input', 'Задержка ввода', 'Applies opponent controls with a small delay.', 'Все нажатия соперника выполняются с небольшой задержкой.', 'fa-hourglass-half', NULL, 'delay', 5000, 'active', 100),
    ('invisible_cells', 'Ghost Blocks', 'Призрачные блоки', 'Invisible Cells', 'Невидимые клетки', 'Makes some locked blocks visually disappear.', 'Часть уже поставленных блоков на поле становится невидимой.', 'fa-eye-low-vision', NULL, 'invisible', 6000, 'active', 110)
ON CONFLICT (effect_key) DO UPDATE SET
    label = EXCLUDED.label,
    label_ru = EXCLUDED.label_ru,
    title = EXCLUDED.title,
    title_ru = EXCLUDED.title_ru,
    description = EXCLUDED.description,
    description_ru = EXCLUDED.description_ru,
    icon = EXCLUDED.icon,
    visual = EXCLUDED.visual,
    duration_ms = EXCLUDED.duration_ms,
    status = EXCLUDED.status,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();
