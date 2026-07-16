UPDATE cosmetic_items
SET rarity = CASE item_key
        WHEN 'friend_palette' THEN 'common'
        WHEN 'first_match_palette' THEN 'common'
        WHEN 'friend_glow_color' THEN 'rare'
        WHEN 'friend_glow' THEN 'rare'
        ELSE rarity
    END,
    updated_at = NOW()
WHERE item_key IN ('friend_palette', 'first_match_palette', 'friend_glow_color', 'friend_glow');

INSERT INTO cosmetic_items (
    item_key, collection_id, type, rarity, label, label_ru,
    description, description_ru, status, is_shop_visible,
    is_unlockable, sort_order, metadata
)
SELECT
    reward.item_key,
    cosmetic_collections.id,
    'skin_pack',
    reward.rarity,
    reward.label,
    reward.label_ru,
    reward.description,
    reward.description_ru,
    'active',
    FALSE,
    TRUE,
    reward.sort_order,
    jsonb_build_object(
        'cssPreset', reward.preset,
        'unlockCondition', 'completed_matches',
        'requiredMatches', reward.required_matches
    )
FROM cosmetic_collections
CROSS JOIN (
    VALUES
        ('match_5_citrus', 'rare', 'Citrus Arcade', 'Цитрусовая аркада',
            'A cheerful glossy palette awarded after five completed matches.',
            'Весёлая глянцевая палитра за пять завершённых матчей.',
            40, 'citrus-arcade', 5),
        ('match_10_confetti', 'rare', 'Confetti Circuit', 'Конфетти-контур',
            'A lively circuit filled with animated sparks and confetti.',
            'Живой контур с анимированными искрами и конфетти.',
            50, 'confetti-circuit', 10),
        ('match_100_reeds', 'epic', 'Emerald Reeds', 'Изумрудные камыши',
            'A living wetland pattern with swaying reeds inside every block.',
            'Живой болотный узор с покачивающимися камышами внутри каждого блока.',
            60, 'reed-garden', 100),
        ('match_1000_nebula', 'legendary', 'Nebula Forge', 'Кузница туманностей',
            'A deep-space skin with rotating nebula clouds and pulsing stars.',
            'Космический комплект с вращающимися туманностями и мерцающими звёздами.',
            70, 'nebula-forge', 1000),
        ('match_5000_dragon', 'legendary', 'Dragon Vault', 'Драконья сокровищница',
            'Animated dragon scales crossed by a molten treasury shine.',
            'Анимированная драконья чешуя с огненным блеском сокровищницы.',
            80, 'dragon-vault', 5000),
        ('match_10000_crown', 'mythic', 'Celestial Crown', 'Небесная корона',
            'A mythic prismatic crown forged for ten thousand completed matches.',
            'Мифическая призматическая корона за десять тысяч завершённых матчей.',
            90, 'celestial-crown', 10000)
) AS reward(
    item_key, rarity, label, label_ru, description, description_ru,
    sort_order, preset, required_matches
)
WHERE cosmetic_collections.collection_key = 'core'
ON CONFLICT (item_key) DO UPDATE
SET rarity = EXCLUDED.rarity,
    label = EXCLUDED.label,
    label_ru = EXCLUDED.label_ru,
    description = EXCLUDED.description,
    description_ru = EXCLUDED.description_ru,
    metadata = EXCLUDED.metadata,
    status = 'active',
    updated_at = NOW();

INSERT INTO skin_pack_manifests (cosmetic_item_id, version, manifest, status)
SELECT
    cosmetic_items.id,
    1,
    jsonb_build_object(
        'format', 'tetris-skin-pack-v1',
        'preset', reward.preset,
        'board', jsonb_build_object('renderMode', 'css', 'style', '{}'::jsonb),
        'emptyCell', jsonb_build_object('renderMode', 'css', 'style', '{}'::jsonb),
        'ghost', jsonb_build_object('renderMode', 'css', 'style', '{}'::jsonb),
        'pieces', '{}'::jsonb
    ),
    'active'
FROM cosmetic_items
JOIN (
    VALUES
        ('match_5_citrus', 'citrus-arcade'),
        ('match_10_confetti', 'confetti-circuit'),
        ('match_100_reeds', 'reed-garden'),
        ('match_1000_nebula', 'nebula-forge'),
        ('match_5000_dragon', 'dragon-vault'),
        ('match_10000_crown', 'celestial-crown')
) AS reward(item_key, preset) ON reward.item_key = cosmetic_items.item_key
ON CONFLICT (cosmetic_item_id, version) DO UPDATE
SET manifest = EXCLUDED.manifest,
    status = 'active';

CREATE OR REPLACE FUNCTION completed_match_count(target_user_id INTEGER)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
    SELECT COUNT(DISTINCT match_players.match_id)::INTEGER
    FROM match_players
    JOIN matches ON matches.id = match_players.match_id
    WHERE match_players.user_id = target_user_id
        AND matches.status = 'finished';
$$;

CREATE OR REPLACE FUNCTION grant_match_milestone_rewards(
    reward_user_id INTEGER,
    reward_match_id BIGINT DEFAULT NULL,
    reward_mode TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    match_count INTEGER;
    common_payload JSONB;
BEGIN
    match_count := completed_match_count(reward_user_id);
    common_payload := jsonb_build_object(
        'matchCount', match_count,
        'matchId', reward_match_id,
        'mode', reward_mode
    );

    IF match_count >= 1 THEN
        PERFORM grant_skin_reward(
            reward_user_id,
            'first_match_palette',
            'first-match-reward',
            '{"grantReason":"completed_matches","requiredMatches":1}'::jsonb,
            common_payload || '{"requiredMatches":1}'::jsonb
        );
    END IF;

    IF match_count >= 5 THEN
        PERFORM grant_skin_reward(
            reward_user_id,
            'match_5_citrus',
            'five-matches-reward',
            '{"grantReason":"completed_matches","requiredMatches":5}'::jsonb,
            common_payload || '{"requiredMatches":5}'::jsonb
        );
    END IF;

    IF match_count >= 10 THEN
        PERFORM grant_skin_reward(
            reward_user_id,
            'match_10_confetti',
            'ten-matches-reward',
            '{"grantReason":"completed_matches","requiredMatches":10}'::jsonb,
            common_payload || '{"requiredMatches":10}'::jsonb
        );
    END IF;

    IF match_count >= 100 THEN
        PERFORM grant_skin_reward(
            reward_user_id,
            'match_100_reeds',
            'hundred-matches-reward',
            '{"grantReason":"completed_matches","requiredMatches":100}'::jsonb,
            common_payload || '{"requiredMatches":100}'::jsonb
        );
    END IF;

    IF match_count >= 1000 THEN
        PERFORM grant_skin_reward(
            reward_user_id,
            'match_1000_nebula',
            'thousand-matches-reward',
            '{"grantReason":"completed_matches","requiredMatches":1000}'::jsonb,
            common_payload || '{"requiredMatches":1000}'::jsonb
        );
    END IF;

    IF match_count >= 5000 THEN
        PERFORM grant_skin_reward(
            reward_user_id,
            'match_5000_dragon',
            'five-thousand-matches-reward',
            '{"grantReason":"completed_matches","requiredMatches":5000}'::jsonb,
            common_payload || '{"requiredMatches":5000}'::jsonb
        );
    END IF;

    IF match_count >= 10000 THEN
        PERFORM grant_skin_reward(
            reward_user_id,
            'match_10000_crown',
            'ten-thousand-matches-reward',
            '{"grantReason":"completed_matches","requiredMatches":10000}'::jsonb,
            common_payload || '{"requiredMatches":10000}'::jsonb
        );
    END IF;
END;
$$;

SELECT grant_match_milestone_rewards(users.id)
FROM users
WHERE completed_match_count(users.id) >= 1;

DROP TRIGGER IF EXISTS match_players_grant_first_match_skin_trigger ON match_players;
DROP TRIGGER IF EXISTS matches_grant_first_match_skin_trigger ON matches;
DROP TRIGGER IF EXISTS match_players_grant_match_milestones_trigger ON match_players;
DROP TRIGGER IF EXISTS matches_grant_match_milestones_trigger ON matches;

CREATE OR REPLACE FUNCTION grant_match_milestones_from_player()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    played_match RECORD;
BEGIN
    IF NEW.user_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT id, mode, status INTO played_match
    FROM matches
    WHERE id = NEW.match_id;

    IF played_match.status = 'finished' THEN
        PERFORM grant_match_milestone_rewards(NEW.user_id, NEW.match_id, played_match.mode);
    END IF;

    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION grant_match_milestones_from_match()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    matched_player RECORD;
BEGIN
    IF NEW.status <> 'finished' OR OLD.status = 'finished' THEN
        RETURN NEW;
    END IF;

    FOR matched_player IN
        SELECT DISTINCT user_id
        FROM match_players
        WHERE match_id = NEW.id AND user_id IS NOT NULL
    LOOP
        PERFORM grant_match_milestone_rewards(matched_player.user_id, NEW.id, NEW.mode);
    END LOOP;

    RETURN NEW;
END;
$$;

CREATE TRIGGER match_players_grant_match_milestones_trigger
AFTER INSERT OR UPDATE OF user_id ON match_players
FOR EACH ROW
EXECUTE FUNCTION grant_match_milestones_from_player();

CREATE TRIGGER matches_grant_match_milestones_trigger
AFTER UPDATE OF status ON matches
FOR EACH ROW
EXECUTE FUNCTION grant_match_milestones_from_match();
