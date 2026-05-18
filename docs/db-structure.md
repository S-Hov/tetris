# Структура БД `pvp_tetris`

Источник: [`docs/dump-pvp_tetris.sql`](/home/hov/Документы/projects/tetris/docs/dump-pvp_tetris.sql)

Примечание: файл `dump-pvp_tetris.sql` на самом деле является PostgreSQL custom dump, а не plain SQL. Для чтения структуры использовался `pg_restore`.

## Общая картина

База состоит из 20 основных таблиц:

1. `roles`
2. `users`
3. `auth_logs`
4. `email_verifications`
5. `matches`
6. `match_teams`
7. `match_players`
8. `match_events`
9. `user_rank_stats`
10. `rating_history`
11. `game_rooms`
12. `game_room_players`
13. `support_requests`
14. `support_user_blocks`
15. `donation_wallets`
16. `donations`
17. `donation_verification_events`
18. `donation_currencies`
19. `donation_networks`
20. `donation_currency_networks`

По смыслу схема делится на 3 зоны:

- аутентификация и аккаунты: `roles`, `users`, `auth_logs`, `email_verifications`
- матчи и игровая телеметрия: `matches`, `match_teams`, `match_players`, `match_events`
- рейтинг и ранговая статистика: `user_rank_stats`, `rating_history`
- runtime-состояние комнат: `game_rooms`, `game_room_players`
- поддержка и пожертвования: `support_requests`, `support_user_blocks`, `donation_currencies`, `donation_networks`, `donation_currency_networks`, `donation_wallets`, `donations`, `donation_verification_events`

## Карта связей

```text
roles
  └─< users
       ├─< auth_logs
       ├─< email_verifications
       ├─1 user_rank_stats
       ├─< rating_history
       ├─< support_requests
       ├─< support_user_blocks
       ├─< donations
       └─< match_players

matches
  ├─< match_teams
  │    └─< match_players
  ├─< match_players
  ├─< match_events
  └─< rating_history

matches.winner_team_id
  └─> match_teams.id

match_events.source_player_id
  └─> match_players.id

match_events.target_player_id
  └─> match_players.id

donation_currencies
  └─< donation_currency_networks

donation_networks
  └─< donation_currency_networks

donation_currency_networks
  └─< donation_wallets

donation_wallets
  └─< donations

donations
  └─< donation_verification_events
```

## Таблицы

### `roles`

Справочник ролей пользователя.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | `integer` | нет | `nextval(...)` | PK роли |
| `key` | `varchar(50)` | нет |  | машинный ключ роли |
| `name` | `varchar(100)` | нет |  | человекочитаемое имя |
| `created_at` | `timestamp` | да | `now()` | дата создания |

Ограничения:

- PK: `id`
- UNIQUE: `key`

Связи:

- `users.role_id -> roles.id`

Индексы:

- уникальный индекс на `key` через `UNIQUE`

### `users`

Основная таблица аккаунтов.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | `integer` | нет | `nextval(...)` | PK пользователя |
| `role_id` | `integer` | нет |  | роль пользователя |
| `username` | `varchar(100)` | нет |  | логин/ник |
| `email` | `varchar(255)` | нет |  | email пользователя |
| `password_hash` | `text` | нет |  | хеш пароля |
| `avatar_url` | `text` | да |  | ссылка на аватар |
| `status` | `varchar(50)` | нет | `'pending_verification'` | статус аккаунта |
| `email_verified_at` | `timestamp` | да |  | когда подтвержден email |
| `last_login_at` | `timestamp` | да |  | последний вход |
| `created_at` | `timestamp` | да | `now()` | дата создания |
| `updated_at` | `timestamp` | да | `now()` | дата обновления |

Ограничения:

- PK: `id`
- UNIQUE: `email`

Связи:

- `role_id -> roles.id`
- на `users.id` ссылаются:
  - `auth_logs.user_id`
  - `email_verifications.user_id`
  - `match_players.user_id`
  - `user_rank_stats.user_id`
  - `rating_history.user_id`

Индексы:

- `idx_users_email` на `email`
- `idx_users_role_id` на `role_id`

Замечания:

- отдельного `UNIQUE` на `username` нет
- допустимые значения `status` в самой схеме не ограничены `CHECK`-констрейнтом

### `auth_logs`

Журнал событий авторизации.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | `integer` | нет | `nextval(...)` | PK записи |
| `user_id` | `integer` | да |  | пользователь |
| `event_type` | `varchar(50)` | нет |  | тип события |
| `ip_address` | `inet` | да |  | IP-адрес |
| `user_agent` | `text` | да |  | user-agent клиента |
| `created_at` | `timestamp` | да | `now()` | когда произошло событие |

Ограничения:

- PK: `id`

Связи:

- `user_id -> users.id ON DELETE SET NULL`

Индексы:

- `idx_auth_logs_user_id` на `user_id`
- `idx_auth_logs_created_at` на `created_at`

### `email_verifications`

Записи подтверждения email.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | `integer` | нет | `nextval(...)` | PK записи |
| `user_id` | `integer` | нет |  | пользователь |
| `email` | `varchar(255)` | нет |  | email, который подтверждается |
| `code_hash` | `text` | нет |  | хеш кода подтверждения |
| `status` | `varchar(50)` | нет | `'pending'` | статус подтверждения |
| `attempts_count` | `integer` | да | `0` | число попыток |
| `expires_at` | `timestamp` | нет |  | срок действия кода |
| `verified_at` | `timestamp` | да |  | время успешного подтверждения |
| `created_at` | `timestamp` | да | `now()` | дата создания |
| `updated_at` | `timestamp` | да | `now()` | дата обновления |

Ограничения:

- PK: `id`

Связи:

- `user_id -> users.id ON DELETE CASCADE`

Индексы:

- `idx_email_verifications_email` на `email`
- `idx_email_verifications_user_id` на `user_id`

Замечания:

- `status` тоже не ограничен `CHECK`-констрейнтом

### `matches`

Карточка матча.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | `bigint` | нет | `nextval(...)` | PK матча |
| `mode` | `varchar(20)` | нет |  | игровой режим |
| `match_type` | `varchar(30)` | нет |  | тип матча |
| `status` | `varchar(30)` | нет | `'created'` | статус матча |
| `is_online` | `boolean` | нет | `true` | онлайн-матч или нет |
| `counts_for_rating` | `boolean` | нет | `false` | учитывать ли в рейтинге |
| `winner_team_id` | `bigint` | да |  | команда-победитель |
| `started_at` | `timestamp` | да |  | старт матча |
| `ended_at` | `timestamp` | да |  | завершение матча |
| `created_at` | `timestamp` | нет | `now()` | дата создания |
| `updated_at` | `timestamp` | нет | `now()` | дата обновления |
| `room_id` | `varchar(100)` | да |  | идентификатор игровой комнаты |

Ограничения:

- PK: `id`
- CHECK `mode`:
  - `solo`
  - `1v1`
  - `2v2`
  - `5v5`
  - `royale`
- CHECK `match_type`:
  - `ranked`
  - `casual`
  - `friends`
  - `private`
- CHECK `status`:
  - `created`
  - `playing`
  - `finished`
  - `cancelled`
  - `abandoned`

Связи:

- `winner_team_id -> match_teams.id ON DELETE SET NULL`
- на `matches.id` ссылаются:
  - `match_teams.match_id`
  - `match_players.match_id`
  - `match_events.match_id`
  - `rating_history.match_id`

Индексы:

- `idx_matches_mode` на `mode`
- `idx_matches_status` на `status`
- `idx_matches_started_at` на `started_at`
- `idx_matches_counts_for_rating` на `counts_for_rating`
- `idx_matches_room_id` на `room_id`

Замечания:

- здесь есть циклическая бизнес-связь: матч содержит команды, а матч также хранит `winner_team_id`

### `game_rooms`

Текущие игровые комнаты. Это оперативное состояние комнаты, вынесенное из памяти сервера в БД: состав,
статус, настройки и привязка к текущему/последнему матчу.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | `varchar(100)` | нет |  | публичный ID комнаты |
| `status` | `varchar(30)` | нет | `'waiting'` | состояние комнаты |
| `match_id` | `bigint` | да |  | текущий или последний матч комнаты |
| `mode_key` | `varchar(20)` | нет |  | режим комнаты |
| `owner_socket_id` | `varchar(100)` | да |  | сокет владельца комнаты |
| `owner_user_key` | `varchar(128)` | да |  | стабильный ключ владельца: user id или guest id |
| `settings` | `jsonb` | нет | `'{}'` | настройки матча: эффекты, спецблоки, тип матча |
| `metadata` | `jsonb` | нет | `'{}'` | запас для будущих режимов, invite-настроек, tournament/party данных |
| `created_at` | `timestamp` | нет | `now()` | дата создания |
| `updated_at` | `timestamp` | нет | `now()` | дата обновления |

Ограничения:

- PK: `id`
- CHECK `status`:
  - `waiting`
  - `playing`
  - `closed`
- CHECK `mode_key`:
  - `1v1`
  - `2v2`
  - `5v5`
  - `royale`

Связи:

- `match_id -> matches.id ON DELETE SET NULL`
- на `game_rooms.id` ссылается `game_room_players.room_id`

Индексы:

- `idx_game_rooms_status` на `status`
- `idx_game_rooms_mode_key` на `mode_key`
- `idx_game_rooms_match_id` на `match_id`
- `idx_game_rooms_updated_at` на `updated_at`

### `game_room_players`

Текущие участники игровых комнат. Хранит сокет, команду, готовность и актуальный игровой снапшот игрока.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | `bigint` | нет | `nextval(...)` | PK участника комнаты |
| `room_id` | `varchar(100)` | нет |  | комната |
| `socket_id` | `varchar(100)` | нет |  | актуальный socket.io id игрока |
| `user_key` | `varchar(128)` | нет |  | стабильный ключ игрока: user id или guest id |
| `user_id` | `integer` | да |  | связанный пользователь, если зарегистрирован |
| `is_registered` | `boolean` | нет | `false` | зарегистрированный ли игрок |
| `username` | `varchar(100)` | нет |  | отображаемое имя в комнате |
| `avatar_url` | `text` | да |  | аватар |
| `rank_stats` | `jsonb` | да |  | ранговый снапшот на момент подключения |
| `is_ready` | `boolean` | нет | `false` | готовность к старту |
| `game_state` | `jsonb` | да |  | последний игровой снапшот: score, board, level, energy |
| `team_id` | `bigint` | да |  | команда текущего матча |
| `team_number` | `integer` | да |  | номер команды в комнате |
| `team_slot` | `varchar(20)` | да |  | слот команды (`team_1`, `team_2`) |
| `match_player_id` | `bigint` | да |  | участник текущего матча |
| `metadata` | `jsonb` | нет | `'{}'` | запас под роли, loadout, party-id, spectator-флаги |
| `joined_at` | `timestamp` | нет | `now()` | когда вошёл в комнату |
| `updated_at` | `timestamp` | нет | `now()` | дата обновления |

Ограничения:

- PK: `id`
- UNIQUE: `(room_id, user_key)`
- UNIQUE: `socket_id`
- CHECK `team_number`:
  - `1`
  - `2`
- CHECK `team_slot`:
  - `team_1`
  - `team_2`

Связи:

- `room_id -> game_rooms.id ON DELETE CASCADE`
- `user_id -> users.id ON DELETE SET NULL`
- `team_id -> match_teams.id ON DELETE SET NULL`
- `match_player_id -> match_players.id ON DELETE SET NULL`

Индексы:

- `idx_game_room_players_room_id` на `room_id`
- `idx_game_room_players_socket_id` на `socket_id`
- `idx_game_room_players_user_key` на `user_key`
- `idx_game_room_players_user_id` на `user_id`
- `idx_game_room_players_team` на `(room_id, team_number)`
- `idx_game_room_players_updated_at` на `updated_at`

### `match_teams`

Команды внутри матча.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | `bigint` | нет | `nextval(...)` | PK команды в матче |
| `match_id` | `bigint` | нет |  | матч |
| `team_number` | `integer` | нет |  | номер команды внутри матча |
| `team_score` | `integer` | нет | `0` | командный счет |
| `result` | `varchar(20)` | да | `'none'` | итог команды |
| `created_at` | `timestamp` | нет | `now()` | дата создания |

Ограничения:

- PK: `id`
- UNIQUE: `(match_id, team_number)`
- CHECK `result`:
  - `win`
  - `lose`
  - `draw`
  - `none`

Связи:

- `match_id -> matches.id ON DELETE CASCADE`
- на `match_teams.id` ссылаются:
  - `matches.winner_team_id`
  - `match_players.team_id`

Индексы:

- `idx_match_teams_match_id` на `match_id`

### `match_players`

Участники матча. Подходит и для зарегистрированных игроков, и для гостевых/временных участников.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | `bigint` | нет | `nextval(...)` | PK участника матча |
| `match_id` | `bigint` | нет |  | матч |
| `team_id` | `bigint` | да |  | команда внутри матча |
| `user_id` | `integer` | да |  | связанный пользователь |
| `is_registered` | `boolean` | нет | `true` | зарегистрированный ли игрок |
| `nickname` | `varchar(100)` | да |  | ник на момент матча |
| `score` | `integer` | нет | `0` | очки |
| `lines_cleared` | `integer` | нет | `0` | очищено линий |
| `level_reached` | `integer` | нет | `1` | достигнутый уровень |
| `result` | `varchar(20)` | да | `'none'` | итог игрока |
| `joined_at` | `timestamp` | да | `now()` | когда вошел в матч |
| `left_at` | `timestamp` | да |  | когда покинул матч |
| `created_at` | `timestamp` | нет | `now()` | дата создания записи |

Ограничения:

- PK: `id`
- CHECK `result`:
  - `win`
  - `lose`
  - `draw`
  - `none`

Связи:

- `match_id -> matches.id ON DELETE CASCADE`
- `team_id -> match_teams.id ON DELETE SET NULL`
- `user_id -> users.id ON DELETE SET NULL`
- на `match_players.id` ссылаются:
  - `match_events.source_player_id`
  - `match_events.target_player_id`

Индексы:

- `idx_match_players_match_id` на `match_id`
- `idx_match_players_team_id` на `team_id`
- `idx_match_players_user_id` на `user_id`
- `idx_match_players_result` на `result`

Замечания:

- `user_id` nullable, значит таблица явно допускает незарегистрированных или исторически отвязанных игроков
- `nickname` хранится прямо в матче, поэтому имя игрока в истории не зависит от будущих изменений в `users.username`

### `match_events`

Лог игровых событий внутри матча.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | `bigint` | нет | `nextval(...)` | PK события |
| `match_id` | `bigint` | нет |  | матч |
| `source_player_id` | `bigint` | да |  | инициатор события |
| `target_player_id` | `bigint` | да |  | цель события |
| `event_type` | `varchar(50)` | нет |  | тип события |
| `payload` | `jsonb` | да |  | произвольные данные события |
| `created_at` | `timestamp` | нет | `now()` | время события |

Ограничения:

- PK: `id`

Связи:

- `match_id -> matches.id ON DELETE CASCADE`
- `source_player_id -> match_players.id ON DELETE SET NULL`
- `target_player_id -> match_players.id ON DELETE SET NULL`

Индексы:

- `idx_match_events_match_id` на `match_id`
- `idx_match_events_event_type` на `event_type`

Замечания:

- `payload` в `jsonb` делает таблицу расширяемой без миграций под каждый новый тип события

### `user_rank_stats`

Актуальный срез рейтинговой статистики пользователя. Одна строка на одного пользователя.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `user_id` | `integer` | нет |  | PK и FK на пользователя |
| `rank_points` | `integer` | нет | `0` | ранговые очки |
| `mmr` | `integer` | нет | `1000` | matchmaking rating |
| `wins` | `integer` | нет | `0` | победы |
| `losses` | `integer` | нет | `0` | поражения |
| `draws` | `integer` | нет | `0` | ничьи |
| `best_solo_score` | `integer` | нет | `0` | лучший соло-счет |
| `total_matches` | `integer` | нет | `0` | всего матчей |
| `created_at` | `timestamp` | нет | `now()` | дата создания |
| `updated_at` | `timestamp` | нет | `now()` | дата обновления |

Ограничения:

- PK: `user_id`

Связи:

- `user_id -> users.id ON DELETE CASCADE`

Замечания:

- это 1:1 таблица-агрегат относительно `users`

### `rating_history`

История изменения рейтинга пользователя.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | `bigint` | нет | `nextval(...)` | PK записи |
| `user_id` | `integer` | нет |  | пользователь |
| `match_id` | `bigint` | да |  | матч-источник изменения |
| `old_rank_points` | `integer` | нет |  | старые rank points |
| `new_rank_points` | `integer` | нет |  | новые rank points |
| `rank_delta` | `integer` | нет |  | изменение rank points |
| `old_mmr` | `integer` | нет |  | старый mmr |
| `new_mmr` | `integer` | нет |  | новый mmr |
| `mmr_delta` | `integer` | нет |  | изменение mmr |
| `reason` | `varchar(50)` | нет | `'match_result'` | причина изменения |
| `created_at` | `timestamp` | нет | `now()` | когда изменение записано |

Ограничения:

- PK: `id`

Связи:

- `user_id -> users.id ON DELETE CASCADE`
- `match_id -> matches.id ON DELETE SET NULL`

Замечания:

- хранит и состояние до, и состояние после, поэтому пригодна для аудита и восстановления динамики рейтинга
- `reason` не ограничен `CHECK`-констрейнтом

### `support_requests`

Заявки пользователей: баги, идеи, пожелания по режимам и балансу. Таблица рассчитана на будущую админку и модерацию.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | `bigint` | нет | `nextval(...)` | PK заявки |
| `user_id` | `integer` | да |  | связанный пользователь, если авторизован |
| `category` | `varchar(50)` | нет |  | `bug`, `idea`, `mode`, `balance`, `other` |
| `status` | `varchar(30)` | нет | `'new'` | `new`, `triaged`, `in_progress`, `closed`, `spam` |
| `priority` | `varchar(20)` | нет | `'normal'` | `low`, `normal`, `high`, `critical` |
| `contact_name` | `varchar(120)` | да |  | ник или имя для связи |
| `contact_email` | `varchar(255)` | да |  | email для ответа |
| `title` | `varchar(180)` | да |  | короткая тема |
| `message` | `text` | нет |  | текст обращения |
| `page_url` | `text` | да |  | страница, откуда отправили заявку |
| `attachment_url` | `text` | да |  | ссылка на файл/скриншот после появления загрузок |
| `client_context` | `jsonb` | нет | `'{}'` | браузер, версия клиента, доп. диагностика |
| `admin_notes` | `text` | да |  | внутренние заметки |
| `resolved_at` | `timestamp` | да |  | когда закрыто |
| `created_at` | `timestamp` | нет | `now()` | дата создания |
| `updated_at` | `timestamp` | нет | `now()` | дата обновления |

Индексы: `user_id`, `category`, `status`, `created_at`.

Additional feedback channel fields added by migration `012_feedback_channels_and_support_blocks.sql`:

| Field | Type | Null | Default | Description |
|---|---|---|---|---|
| `preferred_channel` | `varchar(20)` | no | `'email'` | Reply channel: `email` or `telegram` |
| `telegram_token` | `text` | yes |  | Backend-generated token used in Telegram bot start URL |
| `telegram_url` | `text` | yes |  | Full Telegram bot URL returned to frontend |
| `telegram_user_id` | `text` | yes |  | Telegram user id captured from `/start TOKEN` |
| `telegram_chat_id` | `text` | yes |  | Telegram chat id used for support replies |
| `telegram_username` | `text` | yes |  | Telegram username captured during linking |
| `telegram_linked_at` | `timestamp` | yes |  | Time when the support request was linked to Telegram |

### `support_user_blocks`

Support-only blocks for registered users. Active rows prevent a user from creating new feedback/support tickets without disabling the whole account.

| Field | Type | Null | Default | Description |
|---|---|---|---|---|
| `id` | `bigint` | no | `nextval(...)` | PK |
| `user_id` | `integer` | no |  | Blocked user, unique |
| `status` | `varchar(20)` | no | `'active'` | `active` or `inactive` |
| `reason` | `text` | yes |  | Internal admin reason |
| `blocked_by_user_id` | `integer` | yes |  | Admin who created/updated the block |
| `blocked_until` | `timestamp` | yes |  | Optional expiry time |
| `created_at` | `timestamp` | no | `now()` | Creation time |
| `updated_at` | `timestamp` | no | `now()` | Update time |

### `donation_currencies`

Справочник валют, которые можно использовать в донатах.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `code` | `varchar(20)` | нет |  | PK, тикер валюты: `USDT`, `BTC`, `TON` |
| `name` | `varchar(100)` | нет |  | человекочитаемое название |
| `symbol` | `varchar(20)` | да |  | короткий символ/тикер |
| `icon_url` | `text` | да |  | URL иконки |
| `icon_symbol` | `varchar(20)` | да |  | текстовая иконка для UI |
| `decimals` | `integer` | нет | `8` | количество знаков после запятой |
| `status` | `varchar(30)` | нет | `'active'` | `active`, `inactive` |
| `sort_order` | `integer` | нет | `0` | порядок показа |
| `metadata` | `jsonb` | нет | `'{}'` | расширение под провайдеры |
| `created_at` | `timestamp` | нет | `now()` | дата создания |
| `updated_at` | `timestamp` | нет | `now()` | дата обновления |

### `donation_networks`

Справочник сетей, в которых можно принимать валюты.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `key` | `varchar(50)` | нет |  | PK, машинный ключ сети |
| `name` | `varchar(100)` | нет |  | человекочитаемое название |
| `native_currency_code` | `varchar(20)` | да |  | нативная валюта сети |
| `chain_id` | `varchar(50)` | да |  | chain id для EVM-сетей |
| `explorer_url` | `text` | да |  | ссылка на explorer |
| `icon_url` | `text` | да |  | URL иконки |
| `icon_symbol` | `varchar(20)` | да |  | текстовая иконка |
| `status` | `varchar(30)` | нет | `'active'` | `active`, `inactive` |
| `sort_order` | `integer` | нет | `0` | порядок показа |
| `metadata` | `jsonb` | нет | `'{}'` | расширение под провайдеры |
| `created_at` | `timestamp` | нет | `now()` | дата создания |
| `updated_at` | `timestamp` | нет | `now()` | дата обновления |

### `donation_currency_networks`

Связь валют и сетей: один актив может ходить в нескольких сетях, а сеть может поддерживать несколько активов.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | `bigint` | нет | `nextval(...)` | PK связи |
| `currency_code` | `varchar(20)` | нет |  | валюта |
| `network_key` | `varchar(50)` | нет |  | сеть |
| `token_standard` | `varchar(50)` | да |  | `native`, `ERC20`, `TRC20`, `SPL` и т.п. |
| `contract_address` | `text` | да |  | адрес контракта токена |
| `min_confirmations` | `integer` | нет | `1` | минимум подтверждений |
| `memo_required` | `boolean` | нет | `false` | нужен ли memo/tag/comment |
| `deposit_enabled` | `boolean` | нет | `true` | включён ли приём |
| `status` | `varchar(30)` | нет | `'active'` | `active`, `inactive` |
| `sort_order` | `integer` | нет | `0` | порядок показа |
| `metadata` | `jsonb` | нет | `'{}'` | расширение под провайдеры |
| `created_at` | `timestamp` | нет | `now()` | дата создания |
| `updated_at` | `timestamp` | нет | `now()` | дата обновления |

Ограничения: уникальность `(currency_code, network_key)`.

### `donation_wallets`

Справочник адресов, на которые проект принимает пожертвования. Валюта и сеть разделены, чтобы один актив можно было принимать в разных сетях.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | `bigint` | нет | `nextval(...)` | PK кошелька |
| `currency_network_id` | `bigint` | да |  | связь валюты и сети |
| `currency_code` | `varchar(20)` | нет |  | `TON`, `USDT`, `BTC`, `ETH` и т.п. |
| `network_key` | `varchar(50)` | нет |  | машинный ключ сети: `ton`, `trc20`, `bitcoin`, `erc20` |
| `network_name` | `varchar(100)` | нет |  | человекочитаемое имя сети |
| `address` | `text` | нет |  | адрес кошелька |
| `address_label` | `varchar(120)` | да |  | подпись для UI |
| `memo_tag` | `text` | да |  | memo/tag/comment, если нужен сети |
| `status` | `varchar(30)` | нет | `'active'` | `active`, `inactive`, `test` |
| `sort_order` | `integer` | нет | `0` | порядок показа |
| `metadata` | `jsonb` | нет | `'{}'` | расширение под провайдеры и лимиты |
| `created_at` | `timestamp` | нет | `now()` | дата создания |
| `updated_at` | `timestamp` | нет | `now()` | дата обновления |

Ограничения: уникальность `(currency_code, network_key, address)`.
Индексы: `(currency_code, network_key)`, `status`.

### `donations`

Заявка/запись о пожертвовании. Факт оплаты считается подтвержденным только после привязки транзакции и перевода статуса в `confirmed`.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | `bigint` | нет | `nextval(...)` | PK доната |
| `user_id` | `integer` | да |  | пользователь, если авторизован |
| `wallet_id` | `bigint` | да |  | адрес приема |
| `donor_name` | `varchar(120)` | да |  | имя/ник отправителя |
| `donor_contact` | `varchar(255)` | да |  | контакт отправителя |
| `currency_code` | `varchar(20)` | нет |  | валюта платежа |
| `network_key` | `varchar(50)` | нет |  | сеть платежа |
| `expected_amount` | `numeric(36,18)` | да |  | сумма, которую пользователь планировал отправить |
| `received_amount` | `numeric(36,18)` | да |  | фактически найденная сумма |
| `amount_usd` | `numeric(14,2)` | да |  | оценка в USD для аналитики |
| `status` | `varchar(40)` | нет | `'created'` | `created`, `waiting_payment`, `pending_verification`, `confirmed`, `failed`, `expired`, `refunded` |
| `tx_hash` | `text` | да |  | хеш транзакции |
| `tx_confirmations` | `integer` | нет | `0` | количество подтверждений сети |
| `verification_source` | `varchar(80)` | да |  | провайдер проверки: node, explorer, manual |
| `verification_payload` | `jsonb` | нет | `'{}'` | сырой ответ проверки |
| `note` | `text` | да |  | комментарий пользователя |
| `paid_at` | `timestamp` | да |  | когда пользователь сообщил/система увидела платеж |
| `confirmed_at` | `timestamp` | да |  | когда платеж подтвержден |
| `expires_at` | `timestamp` | да |  | срок ожидания оплаты |
| `created_at` | `timestamp` | нет | `now()` | дата создания |
| `updated_at` | `timestamp` | нет | `now()` | дата обновления |

Индексы: `user_id`, `wallet_id`, `status`, `(currency_code, network_key)`, `created_at`.
Уникальный частичный индекс: `(network_key, tx_hash) WHERE tx_hash IS NOT NULL`, чтобы один on-chain платеж не засчитался дважды.

### `donation_verification_events`

Журнал проверок платежа. Нужен для аудита: кто/что сменило статус, сколько было подтверждений и какой ответ пришел от провайдера.

| Поле | Тип | Null | По умолчанию | Описание |
|---|---|---|---|---|
| `id` | `bigint` | нет | `nextval(...)` | PK события |
| `donation_id` | `bigint` | нет |  | связанный донат |
| `event_type` | `varchar(50)` | нет |  | `created`, `submitted_tx`, `chain_check`, `confirmed`, `failed`, `expired`, `manual_review` |
| `status_from` | `varchar(40)` | да |  | предыдущий статус |
| `status_to` | `varchar(40)` | да |  | новый статус |
| `tx_hash` | `text` | да |  | хеш, который проверяли |
| `confirmations` | `integer` | да |  | подтверждения на момент события |
| `verification_source` | `varchar(80)` | да |  | источник проверки |
| `payload` | `jsonb` | нет | `'{}'` | сырой ответ/контекст |
| `created_at` | `timestamp` | нет | `now()` | дата события |

Индексы: `donation_id`, `event_type`, `created_at`.

## Политика удаления по связям

Что происходит при удалении родительских сущностей:

- удаление `users`:
  - удаляются `email_verifications`
  - удаляются `user_rank_stats`
  - удаляются `rating_history`
  - удаляются `support_user_blocks`
  - в `support_requests.user_id` ставится `NULL`
  - в `donations.user_id` ставится `NULL`
  - в `auth_logs.user_id` ставится `NULL`
  - в `match_players.user_id` ставится `NULL`
- удаление `matches`:
  - удаляются `match_teams`
  - удаляются `match_players`
  - удаляются `match_events`
  - в `rating_history.match_id` ставится `NULL`
- удаление `match_teams`:
  - в `matches.winner_team_id` ставится `NULL`
  - в `match_players.team_id` ставится `NULL`
- удаление `match_players`:
  - в `match_events.source_player_id` ставится `NULL`
  - в `match_events.target_player_id` ставится `NULL`
- удаление `donation_wallets`:
  - в `donations.wallet_id` ставится `NULL`
- удаление `donations`:
  - удаляются `donation_verification_events`

## Важные доменные правила, уже зашитые в схему

- матч может быть в режимах `solo`, `1v1`, `2v2`, `5v5`, `royale`
- тип матча ограничен значениями `ranked`, `casual`, `friends`, `private`
- статус матча ограничен значениями `created`, `playing`, `finished`, `cancelled`, `abandoned`
- результат команды и игрока ограничен значениями `win`, `lose`, `draw`, `none`
- в рамках одного матча номер команды уникален за счет `UNIQUE (match_id, team_number)`
- ранговая статистика хранится в отдельной 1:1 таблице, а не вычисляется на лету только из истории

## Что в схеме не зафиксировано жестко

Это полезно помнить при разработке:

- нет `CHECK` для `users.status`
- нет `CHECK` для `email_verifications.status`
- нет `CHECK` для `rating_history.reason`
- нет `UNIQUE` на `users.username`
- нет явных `CHECK` на неотрицательность счетчиков и очков

## Практический смысл таблиц

- `users` и `roles` отвечают за учетные записи и права
- `auth_logs` и `email_verifications` закрывают аутентификационный контур
- `matches` это корень игрового агрегата
- `match_teams` нужен для командных режимов и для выбора победителя
- `match_players` хранит состояние конкретного участника в конкретном матче
- `match_events` это поток игровых событий и телеметрии
- `user_rank_stats` это текущий снимок рейтинга
- `rating_history` это журнал изменения рейтинга
- `support_requests` хранит заявки игроков по багам, идеям, режимам и балансу
- `support_user_blocks` хранит блокировки создания обращений для конкретных пользователей
- `donation_wallets` хранит адреса приема пожертвований по валютам и сетям
- `donations` хранит заявки на пожертвования, суммы, сеть, транзакцию и статус подтверждения
- `donation_verification_events` хранит аудит проверок платежей и смен статусов

## Рекомендация по использованию этого файла

Если понадобится писать фичи, миграции, запросы или API-ответы, можно опираться на этот документ как на базовый справочник схемы. Если дамп будет обновляться, этот файл тоже стоит обновлять вместе с ним.
