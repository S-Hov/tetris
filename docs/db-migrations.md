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
| `008_admin_analytics_schema.sql` | admin analytics schema |
| `009_oauth_accounts_schema.sql` | nullable `users.email`, nullable `users.password_hash`, `accounts` for OAuth providers |
| `010_admin_seo_analytics_indexes.sql` | SEO and admin analytics indexes |
| `011_donation_catalogs_schema.sql` | donation currency/network catalogs, currency-network pairs, wallet links, seeded common assets/networks |
| `012_feedback_channels_and_support_blocks.sql` | feedback preferred channels, Telegram continuation tokens/URLs, support-only user blocks |
| `013_support_request_telegram_link.sql` | Telegram user/chat link fields for support requests |
| `014_support_request_messages.sql` | Message history for support requests across Telegram/email/admin replies |
| `015_game_effects_catalog.sql` | Catalog of game effects with labels, visuals, images, duration and status |
| `016_rank_tiers_catalog.sql` | Rank tiers catalog with point ranges, localized labels, images and status |
| `017_uploaded_assets_storage.sql` | Uploaded asset metadata storage for files served from `/uploads` |
| `018_enable_public_table_rls.sql` | Enables public-table RLS policies where the schema expects public read access |
| `019_friends_schema.sql` | Friendships and the legacy friend-request permission |
| `020_user_privacy_settings.sql` | Per-user privacy modes, legacy permission migration and automatic defaults |
| `021_game_effects_runtime_metadata.sql` | Runtime balance metadata for existing `game_effects` rows |
| `022_garbage_rain_balance_metadata.sql` | Additional `garbage_rain` balance metadata |
| `023_chat_schema.sql` | Direct chat conversations, members, encrypted message storage and read state |
| `024_match_player_identity.sql` | Stable per-match player identity for registered users and guest sessions |
| `025_cosmetic_catalog_schema.sql` | Cosmetic collections, catalog items and versioned skin manifests |
| `026_cosmetic_inventory_schema.sql` | Player cosmetic inventory, inventory event log and active loadouts |
| `027_seed_default_skin.sql` | Default skin catalog seed, inventory backfill and automatic grants for new users |
| `028_depth_core_registration_gift.sql` | Depth Core CSS skin, registration gifts, NEW/viewed state and idempotent grants |
| `029_friend_glow_skin.sql` | Animated glow skin and automatic first-friend rewards |

Миграции используют `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`
и `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, поэтому baseline можно применить
на пустую БД и аккуратно прогнать поверх уже восстановленной совместимой схемы.
Если существующая база была создана вручную или из dump-файла, перед первым
запуском проверьте, что структура таблиц соответствует `docs/db-structure.md`.

## Новые изменения схемы

Для каждого изменения добавляйте новый файл в `server/migrations/` с возрастающим
префиксом, например:

```text
019_add_user_profile_flags.sql
```

Не изменяйте уже примененные миграции: для production-подхода история должна
оставаться неизменной, а все правки идут новыми файлами.
