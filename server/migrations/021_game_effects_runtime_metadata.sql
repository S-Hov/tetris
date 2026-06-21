UPDATE game_effects
SET metadata = CASE effect_key
    WHEN 'speed_x2_for_4s' THEN '{"speedMultiplier": 2}'::jsonb
    WHEN 'darkness' THEN '{}'::jsonb
    WHEN 'garbage_rain' THEN '{"minBlocks": 6, "maxBlocks": 10, "topSafeRows": 8}'::jsonb
    WHEN 'controls_swap' THEN '{"horizontalDirectionMultiplier": -1}'::jsonb
    WHEN 'fog_piece' THEN '{}'::jsonb
    WHEN 'gravity_lock' THEN '{"speedMultiplier": 3, "lockDelayMultiplier": 0.5, "lockHorizontalAfterDrop": true}'::jsonb
    WHEN 'screen_shake' THEN '{}'::jsonb
    WHEN 'random_rotation' THEN '{"intervalMs": 500, "chance": 0.3}'::jsonb
    WHEN 'sticky_walls' THEN '{"blockHorizontalAtWall": true}'::jsonb
    WHEN 'delay_input' THEN '{"inputDelayMs": 150}'::jsonb
    WHEN 'invisible_cells' THEN '{"hiddenModulo": 11, "hiddenThreshold": 3}'::jsonb
    ELSE metadata
END,
updated_at = NOW()
WHERE effect_key IN (
    'speed_x2_for_4s',
    'darkness',
    'garbage_rain',
    'controls_swap',
    'fog_piece',
    'gravity_lock',
    'screen_shake',
    'random_rotation',
    'sticky_walls',
    'delay_input',
    'invisible_cells'
);
