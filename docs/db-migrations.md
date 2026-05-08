# Миграции PostgreSQL

Проект использует простой raw SQL слой миграций без ORM.

## Запуск

```bash
cd server
npm run db:migrate
```

Команда использует настройки подключения из `server/.env` и существующий
`pool` из `server/db/index.js`.

## Как это работает

- SQL-файлы лежат в `server/migrations/`.
- Runner читает все `.sql` файлы и сортирует их по имени.
- Для учета примененных миграций создается таблица `schema_migrations`.
- Каждая миграция выполняется в отдельной транзакции.
- После успешного выполнения имя файла записывается в `schema_migrations`.
- Если миграция упала, транзакция откатывается, файл не помечается как
  примененный, выполнение останавливается.
- На время запуска берется PostgreSQL advisory lock, чтобы два процесса не
  применяли миграции параллельно.

## Baseline

Начальная схема разбита не одним большим файлом, а по доменным этапам:

| Миграция | Содержимое |
| --- | --- |
| `001_auth_schema.sql` | `roles`, `users`, `email_verifications`, `auth_logs` и индексы |
| `002_seed_roles.sql` | обязательные роли `user` и `admin` |
| `003_match_schema.sql` | `matches`, `match_teams`, `match_players`, `match_events` и индексы |
| `004_add_matches_room_id.sql` | эволюционное поле `matches.room_id` и индекс |
| `005_rating_schema.sql` | `user_rank_stats`, `rating_history` |
| `006_game_rooms_schema.sql` | `game_rooms`, `game_room_players` и индексы |
| `007_support_and_donations_schema.sql` | `support_requests`, `donation_wallets`, `donations`, `donation_verification_events` |

Миграции используют `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`
и `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, поэтому baseline можно применить
на пустую БД и аккуратно прогнать поверх уже восстановленной совместимой схемы.
Если существующая база была создана вручную или из dump-файла, перед первым
запуском проверьте, что структура таблиц соответствует `docs/db-structure.md`.

## Новые изменения схемы

Для каждого изменения добавляйте новый файл в `server/migrations/` с возрастающим
префиксом, например:

```text
007_add_user_profile_flags.sql
```

Не изменяйте уже примененные миграции: для production-подхода история должна
оставаться неизменной, а все правки идут новыми файлами.
