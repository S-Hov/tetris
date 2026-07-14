# Backend Phase 1: защитная сетка и baseline текущего сервера

## Статус

Документ фиксирует результат фазы 1 плана из
`docs/backend-architecture-v2-ru.md`. Он описывает текущее наблюдаемое поведение
legacy backend перед началом структурного переноса.

Дата baseline: 14 июля 2026 года.

Фаза не меняет публичный API и не переносит production-модули. Её задача —
сделать последующие изменения проверяемыми.

## 1. Что теперь защищено автоматически

Машиночитаемый snapshot находится в:

```text
server/tests/contracts/baseline/architecture.json
```

Snapshot содержит актуальный полный список:

- зарегистрированных Express endpoints;
- literal incoming и outgoing Socket.IO events;
- таблиц, созданных SQL migrations;
- относительных import-связей production backend.

Snapshot строится read-only анализатором:

```text
server/scripts/architecture-inventory.js
server/scripts/lib/architectureInventory.js
```

На момент фиксации анализатор видит:

| Контракт | Количество |
| --- | ---: |
| REST endpoints | 102 |
| Incoming Socket.IO events | 31 |
| Outgoing Socket.IO events | 33 |
| Всего Socket.IO contracts | 64 |
| PostgreSQL tables из migrations | 41 |
| Относительные production imports на момент завершения фазы 1 | 236 |

REST, Socket.IO и database sections этого snapshot защищают публичные контракты.
Import graph является архитектурной картой и намеренно обновляется после
проверенного структурного переноса в следующих фазах.

Dynamic socket emits, где имя события хранится в переменной, не могут быть
надёжно извлечены регулярным анализом. Они дополнительно должны быть защищены
характеризационным тестом конкретного realtime-модуля при его переносе.

## 2. REST API baseline

Распределение endpoint по текущим route-файлам:

| Legacy route | Endpoints |
| --- | ---: |
| `routes/admin.js` | 51 |
| `routes/auth.js` | 18 |
| `routes/settings.js` | 7 |
| `routes/support.js` | 6 |
| `routes/friends.js` | 5 |
| `routes/chat.js` | 4 |
| `routes/matches.js` | 4 |
| `routes/users.js` | 2 |
| `routes/analytics.js` | 1 |
| `routes/effects.js` | 1 |
| `routes/feedback.js` | 1 |
| `routes/leaderboard.js` | 1 |
| `routes/telegram.js` | 1 |

Полные method, path, mount path и source каждого endpoint зафиксированы в JSON
snapshot. Удаление, переименование или перенос endpoint без обновления baseline
ломает `npm test`.

Особенно критичными считаются группы:

- `/api/authentication/*` — регистрация, вход, текущий пользователь, пароль,
  verification и OAuth;
- `/api/matches/*` — история, детали и solo result;
- `/api/admin/*` — управление системой, пользователями, БД и migrations;
- `/api/settings/*` — OAuth connections, email и privacy;
- `/api/support/*` — обращения и donations.

Прямой `/uploads` handler не входит в router inventory, потому что регистрируется
в `server.js` как static/regexp route. Он зафиксирован как отдельный
инфраструктурный контракт и должен быть перенесён в фазе `assets`.

## 3. Socket.IO baseline

Распределение уникальных literal contracts по источникам:

| Legacy source | Contracts |
| --- | ---: |
| `sockets/lobby.socket.js` | 13 |
| `sockets/matchmaking.socket.js` | 13 |
| `sockets/game.handlers.js` | 9 |
| `sockets/chat.socket.js` | 8 |
| `sockets/index.js` | 7 |
| `sockets/friends.socket.js` | 5 |
| `sockets/support.socket.js` | 2 |
| realtime services | 7 |

Критические входящие события:

```text
game:update
game:over
ability:use
room:create
room:join
room:leave
player:ready
matchmaking:join
matchmaking:leave
party:create
party:join
party:start-search
chat:message:send
friends:room-invite:send
support:join
```

Критические исходящие события:

```text
match:start
match:end
room:state
room:player-joined
room:player-left
opponent:update
effect:apply
matchmaking:searching
matchmaking:found
party:state
chat:message:new
friends:state
support:updated
persistence:error
```

Полный перечень и source каждого события находится в architecture snapshot.
Этот реестр фиксирует transport contracts, но не объявляет их доменными
событиями. Например, `match:end` остаётся клиентским событием Socket.IO.

## 4. Database baseline

Миграции создают следующие 41 таблицу:

```text
accounts
admin_audit_logs
auth_logs
chat_conversation_members
chat_conversations
chat_direct_conversations
chat_messages
cosmetic_collections
cosmetic_items
donation_currencies
donation_currency_networks
donation_networks
donation_verification_events
donation_wallets
donations
email_verifications
friendships
game_activity_events
game_effects
game_room_players
game_rooms
match_events
match_players
match_teams
matches
rank_tiers
rating_history
roles
site_visit_events
skin_pack_manifests
support_request_messages
support_requests
support_user_blocks
uploaded_assets
user_cosmetic_loadouts
user_inventory_events
user_inventory_items
user_privacy_settings
user_rank_stats
user_sessions
users
```

`schema_migrations` создаётся migration runner, а не SQL migration, поэтому в
автоматический список CREATE TABLE migrations не входит. Это ожидаемое
исключение.

Источник появления каждой таблицы зафиксирован в поле `introducedBy` JSON
snapshot.

## 5. Background и fire-and-forget операции

Полноценного durable worker, cron scheduler или transactional outbox сейчас
нет.

Наблюдаемые фоновые операции:

| Операция | Точка запуска | Текущая гарантия |
| --- | --- | --- |
| Применение DB migrations | CLI `scripts/migrate.js` или admin endpoint | транзакция на migration, advisory lock где доступен |
| Синхронизация локальных uploads в БД | после `httpServer.listen` | fire-and-forget, ошибка только логируется |
| Сохранение room snapshot | debounce timer в game socket handler | in-process timer, теряется при остановке процесса |
| Сохранение game over/match result | `runPersistenceTask` | in-process promise с timeout, клиент может получить persistence event |
| Запись auth log | часть auth controllers | местами fire-and-forget |
| Запись game activity/session | socket handlers | fire-and-forget |
| Friends/chat realtime notifications | controllers и sockets | fire-and-forget, retry отсутствует |
| Activity feed | in-memory service | теряется при restart, не является аудитом |
| Cache активных effects | module-level cache/timers | локален одному server instance |
| Email/Telegram | request-driven services | внешние вызовы, общей durable retry policy нет |

Риски baseline:

- падение процесса может потерять отложенный room snapshot или аналитическое
  событие;
- несколько server instances будут иметь разные in-memory caches и state;
- fire-and-forget ошибки не имеют общего dead-letter журнала;
- Socket.IO emit нельзя использовать как подтверждение persistence;
- activity feed нельзя использовать для экономики или наград.

Эти риски не исправляются в фазе 1. Они зафиксированы для фаз bootstrap,
shared foundation, rooms, matches, analytics и outbox.

## 6. Response и error contracts

Основной REST envelope:

```json
{
  "success": true,
  "code": "MATCH.LIST_LOADED",
  "message": "Список матчей получен",
  "data": {},
  "meta": {}
}
```

Ошибка использует ту же форму с `success: false` и опциональным `errors`.
Язык выбирается из `x-language` или `accept-language`, fallback — русский.

Typed application errors используют стабильные коды вида:

```text
COMMON.UNAUTHORIZED
AUTH.ALREADY_LOGGED_IN
MATCH.LIST_LOADED
FRIENDS.REQUEST_NOT_FOUND
```

Legacy текстовая ошибка преобразуется в соответствующий `COMMON.*` code, но
сохраняет старый `message`.

Admin API пока использует отдельный legacy success envelope:

```json
{
  "success": true,
  "message": "Admin dashboard loaded",
  "data": {}
}
```

Это расхождение намеренно зафиксировано тестом. Унификация должна быть отдельным
осознанным API-изменением, а не побочным эффектом перемещения файлов.

Socket callbacks пока не имеют единого envelope. Их контракты будут
фиксироваться подробнее перед переносом каждого socket-модуля.

## 7. Auth characterization baseline

Автоматически проверяются:

- signed JWT из cookie принимается `checkAuth`;
- `userId` из payload нормализуется в `req.user.id`;
- отсутствующий или невалидный token возвращает `COMMON.UNAUTHORIZED`;
- optional auth оставляет гостя с `req.user = null`;
- валидная сессия блокирует guest-only route через `AUTH.ALREADY_LOGGED_IN`;
- registration username — 3–16 символов, латиница/цифры/underscore;
- registration password — 8–16 символов, uppercase/lowercase/digit;
- login требует валидный email и непустой password;
- verification code принимает только цифры;
- password confirmation должен совпадать.

Эти тесты не заменяют будущие integration tests регистрации и OAuth с test DB,
но защищают текущий transport/auth contract до фазы `identity`.

## 8. Match characterization baseline

Автоматически проверяются:

- score и lines нормализуются в неотрицательные целые;
- level не может быть меньше 1;
- финальный `game:over` payload имеет приоритет над последним snapshot игрока;
- командные score/lines суммируются, level берётся максимальный;
- неполный результат без winner/loser не пишется в repository;
- базовая победа даёт 25 rank points;
- performance bonus ограничен 40 points за победу;
- базовое поражение даёт -15 points;
- компенсация поражения ограничена текущей формулой;
- MMR изменяется на +20/-20, draw даёт 0.

Для доступа к чистой нормализации production behavior не изменялся: функции
статистики получили именованные exports и продолжают вызываться тем же match
service.

Транзакционный integration test полного `finishRoomMatch` появится перед
переносом модуля `matches`, когда будет подготовлена изолированная test DB.

## 9. Admin characterization baseline

Автоматически проверяются:

- общий `adminRouter.use(checkAuth, checkAdmin)` остаётся зарегистрирован;
- все 51 admin endpoint находятся под `/api/admin`;
- критические database, migration, user и support endpoints не исчезли;
- legacy admin response envelope не меняется случайно.

Проверка роли через PostgreSQL будет покрыта integration test в фазе `identity`
или декомпозиции `admin`.

## 10. Карта legacy imports

На момент завершения фазы 1 карта содержала 236 направленных import edges.
Актуальная карта после каждой принятой архитектурной фазы хранится в architecture
snapshot.
Основные связи текущих областей:

| Связь | Количество |
| --- | ---: |
| `routes -> controllers` | 15 |
| `routes -> middleware` | 15 |
| `controllers -> services` | 25 |
| `controllers -> repositories` | 6 |
| `services -> repositories` | 17 |
| `services -> services` | 19 |
| `repositories -> db` | 14 |
| `repositories -> services` | 2 |
| `sockets -> services` | 17 |
| `sockets -> repositories` | 7 |
| `sockets -> sockets` | 12 |

Ключевые архитектурные нарушения, которые baseline делает видимыми:

1. Шесть controller imports обходят service/application слой и идут прямо в
   repositories.
2. Семь socket imports обращаются прямо к repositories.
3. Два repository imports направлены обратно в services.
4. Девятнадцать service-to-service imports скрывают границы бизнес-модулей.
5. `server.js` вручную знает все routes, socket registry, upload controller и
   startup side effect.
6. Старый `shared`, `helpers`, `utils` и middleware образуют циклическое по
   смыслу общее пространство.

Количество imports само по себе не является метрикой качества. Цель следующих
фаз — не минимальное число edges, а разрешённое направление зависимостей и
межмодульный доступ только через публичный API.

## 11. Команды разработчика

Показать сводку текущей архитектуры:

```bash
cd server
npm run architecture:inventory
```

Проверить соответствие snapshot:

```bash
npm run architecture:baseline:check
```

Запустить всю защитную сетку:

```bash
npm test
```

Обновить snapshot после намеренного изменения контракта:

```bash
npm run architecture:baseline:update
```

Snapshot нельзя обновлять только ради зелёного теста. Перед обновлением нужно:

1. Проверить JSON diff.
2. Подтвердить, что удаление или добавление контракта намеренно.
3. Обновить связанную REST/Socket/database документацию.
4. Добавить или изменить behavior test нового контракта.

## 12. Состав тестовой сетки после фазы 1

`npm test` запускает единый aggregator и 22 теста:

- architecture baseline и критические endpoints/events;
- auth middleware и validation schemas;
- match persistence normalization и rating formulas;
- основной response/error envelope;
- admin guards, endpoints и legacy envelope;
- существующие chat encryption tests;
- существующий game effects mapper test.

Тесты фазы 1 не подключаются к production database и не выполняют migrations.

## 13. Definition of Done фазы 1

- [x] Инвентаризированы REST endpoints.
- [x] Инвентаризированы literal Socket.IO contracts.
- [x] Инвентаризированы таблицы migrations.
- [x] Зафиксированы background и fire-and-forget operations.
- [x] Зафиксирован основной и legacy admin response envelope.
- [x] Добавлены auth characterization tests.
- [x] Добавлены match/rating characterization tests.
- [x] Добавлены admin characterization tests.
- [x] Построена полная карта legacy imports.
- [x] Добавлена команда автоматической проверки baseline.
- [x] Все существующие и новые тесты объединены одной `npm test` командой.
- [x] Публичные endpoint и Socket.IO contracts не изменены.

Следующая разрешённая фаза: `Фаза 2. Новый bootstrap и composition root` из
целевого архитектурного документа.
