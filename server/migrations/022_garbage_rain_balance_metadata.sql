UPDATE game_effects
SET metadata = COALESCE(metadata, '{}'::jsonb) || '{"maxColumnRise": 3}'::jsonb,
    updated_at = NOW()
WHERE effect_key = 'garbage_rain';
