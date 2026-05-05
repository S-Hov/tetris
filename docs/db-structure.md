# Структура БД `pvp_tetris`

Источник: [`docs/dump-pvp_tetris.sql`](/home/hov/Документы/projects/tetris/docs/dump-pvp_tetris.sql)

Примечание: файл `dump-pvp_tetris.sql` на самом деле является PostgreSQL custom dump, а не plain SQL. Для чтения структуры использовался `pg_restore`.

## Общая картина

База состоит из 10 таблиц:

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

По смыслу схема делится на 3 зоны:

- аутентификация и аккаунты: `roles`, `users`, `auth_logs`, `email_verifications`
- матчи и игровая телеметрия: `matches`, `match_teams`, `match_players`, `match_events`
- рейтинг и ранговая статистика: `user_rank_stats`, `rating_history`

## Карта связей

```text
roles
  └─< users
       ├─< auth_logs
       ├─< email_verifications
       ├─1 user_rank_stats
       ├─< rating_history
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

## Политика удаления по связям

Что происходит при удалении родительских сущностей:

- удаление `users`:
  - удаляются `email_verifications`
  - удаляются `user_rank_stats`
  - удаляются `rating_history`
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

## Рекомендация по использованию этого файла

Если понадобится писать фичи, миграции, запросы или API-ответы, можно опираться на этот документ как на базовый справочник схемы. Если дамп будет обновляться, этот файл тоже стоит обновлять вместе с ним.
