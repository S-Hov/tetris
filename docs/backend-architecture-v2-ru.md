# Целевая архитектура backend PVP Tetris

## Статус документа

Этот документ фиксирует целевую архитектуру backend и обязательный порядок
перехода к ней. Он описывает не текущее расположение файлов, а состояние, к
которому сервер должен прийти после поэтапного рефакторинга.

Текущее устройство всего проекта по-прежнему описано в
`docs/architecture-ru.md`. При расхождении правил разработки нового backend-кода
приоритет имеет этот документ.

Принятое архитектурное решение:

> Backend остаётся единым Node.js-приложением, но строится как модульный монолит
> с вертикальными бизнес-модулями, явными сценариями использования и
> контролируемыми зависимостями между модулями.

В документе термин `Vertical Slice Architecture`, или `VSA`, означает, что код
группируется прежде всего вокруг бизнес-возможности, а не вокруг технического
типа файла. Это не буквальный перенос frontend FSD на сервер.

## 1. Зачем меняется архитектура

Сейчас backend уже использует знакомую цепочку `route -> controller -> service
-> repository`, но технические слои разложены горизонтально по общим папкам:

```text
server/routes
server/controllers
server/services
server/repositories
server/sockets
```

При росте проекта это приводит к следующим проблемам:

- файлы одного бизнес-домена находятся в нескольких удалённых каталогах;
- крупные файлы `adminRepository`, `adminController`, `matchRepository` и socket
  handlers знают слишком много;
- часть controllers и socket handlers обращается непосредственно к repository;
- repository иногда не только выполняет SQL, но и оркестрирует бизнес-операции;
- REST, Socket.IO, Telegram и admin могут реализовать одну операцию разными
  способами;
- общие папки быстро становятся свалкой несвязанных функций;
- сложно понять владельца таблицы, события или бизнес-правила;
- изменение одного домена затрагивает несколько общих каталогов;
- изолированное тестирование сценариев требует большого количества глобальных
  зависимостей.

Цель изменения — сделать границы системы видимыми в структуре исходного кода и
не позволять новым направлениям, таким как косметика, награды и магазин,
увеличивать существующую связанность.

## 2. Цели и ограничения

### 2.1. Цели

Новая архитектура должна:

1. Позволять развивать один домен, почти не затрагивая остальные.
2. Давать HTTP, Socket.IO, worker и admin один и тот же application API.
3. Хранить бизнес-правила вне controllers, sockets и SQL repositories.
4. Делать транзакционные границы явными.
5. Поддерживать надёжные доменные события через transactional outbox.
6. Позволять переносить старый backend частями без остановки разработки.
7. Упростить unit, integration и contract tests.
8. Подготовить основу для косметики, наград, магазина и достижений.
9. Оставаться понятной небольшой команде без избыточного enterprise-кода.

### 2.2. Что не является целью

- Backend не разбивается на микросервисы.
- Для каждого метода не создаётся обязательный набор из десятка классов.
- Не вводится dependency injection framework.
- PostgreSQL не заменяется другой БД.
- Express и Socket.IO не заменяются только ради новой структуры.
- Старый код не переносится одним большим изменением.
- Не создаётся универсальный `shared`, куда можно положить любой удобный код.

## 3. Основные архитектурные принципы

### 3.1. Модуль владеет бизнес-возможностью

Модуль владеет своими правилами, use cases, таблицами, repositories и
транспортными адаптерами. Например, `cosmetics` владеет каталогом косметики,
инвентарём и loadout, а `rewards` владеет правилами автоматической выдачи.

Модуль создаётся не для каждой таблицы и не для каждого endpoint. Граница
модуля проводится вокруг связного бизнес-домена.

### 3.2. Один сценарий — одна точка входа

Операция `grantCosmeticItem` реализуется один раз в application-слое. Магазин,
награда за событие, админка и промокод вызывают этот use case, а не пишут каждый
свой SQL.

То же правило применяется к завершению матча, обновлению профиля, ответу
поддержки, привязке OAuth и другим операциям.

### 3.3. Transport не содержит бизнес-логику

HTTP controller и socket handler могут:

- извлечь данные из запроса;
- вызвать validation schema;
- получить identity текущего пользователя;
- вызвать application use case;
- преобразовать результат в HTTP или socket response.

Они не должны:

- выполнять SQL;
- менять несколько агрегатов самостоятельно;
- рассчитывать награды или рейтинг;
- определять транзакционную последовательность;
- дублировать правила, уже существующие в application/domain.

### 3.4. Repository отвечает только за persistence

Repository знает PostgreSQL, SQL и преобразование database rows. Repository не
решает, положена ли пользователю награда, можно ли экипировать скин или кто
выиграл матч.

Repository не должен импортировать service другого домена. Координация
нескольких repositories выполняется application use case.

### 3.5. Domain не зависит от Express, Socket.IO и PostgreSQL

Чистые правила, value objects и проверки domain-уровня не импортируют:

- `express`;
- `socket.io`;
- `pg`;
- HTTP response helpers;
- глобальный database pool.

Благодаря этому их можно тестировать без запуска сервера и БД.

### 3.6. Публичный API модуля явный

Другие модули импортируют только `modules/<module>/index.js`. Импорт внутренних
файлов соседнего модуля запрещён.

Правильно:

```js
import { grantCosmeticItem } from '#modules/cosmetics/index.js'
```

Неправильно:

```js
import { insertInventoryItem } from '#modules/cosmetics/infrastructure/inventoryRepository.js'
```

### 3.7. Сначала корректность, затем асинхронность

Операции, от которых зависит ответ пользователю, выполняются синхронно в use
case. Побочные действия, которые допускают задержку, выполняются через outbox:

- аналитика;
- автоматические награды;
- email;
- внешние уведомления;
- обновление activity feed.

### 3.8. Никакой исполняемой логики из БД

БД может хранить декларативные конфигурации, условия и manifests. В БД нельзя
хранить JavaScript, SQL-фрагменты или произвольный код, который сервер затем
исполняет.

## 4. Карта бизнес-модулей

| Модуль | Зона ответственности | Основные владельцы данных |
| --- | --- | --- |
| `identity` | регистрация, вход, пароль, email verification, OAuth accounts, auth sessions | `users` в части credentials, `accounts`, `email_verifications`, `auth_logs` |
| `users` | публичный профиль, avatar, настройки аккаунта, privacy | профильные поля `users`, `user_privacy_settings` |
| `friends` | заявки, дружба, friend permissions, presence projection | `friendships` |
| `chat` | диалоги, сообщения, read state, typing realtime | `chat_*` |
| `rooms` | игровые комнаты, участники, готовность, runtime snapshot | `game_rooms`, `game_room_players` |
| `matchmaking` | очереди, party, подбор и создание комнаты | очередь в памяти или отдельное хранилище; не владеет матчами |
| `matches` | постоянная история матча, команды, игроки, результат и события матча | `matches`, `match_teams`, `match_players`, `match_events` |
| `rating` | rank stats, rating changes, tiers и leaderboard projection | `user_rank_stats`, `rating_history`, `rank_tiers` |
| `effects` | каталог игровых эффектов и их runtime metadata | `game_effects` |
| `cosmetics` | коллекции, items, manifests, inventory и loadout | `cosmetic_*`, `skin_pack_manifests`, `user_inventory_*`, `user_cosmetic_loadouts` |
| `rewards` | каталог доменных событий, reward rules, обработка наград и идемпотентность | event catalog, reward rules, executions |
| `shop` | витрина, цены, заказы и покупка косметики | shop offers, orders, purchase records |
| `achievements` | определения достижений и прогресс пользователей | achievements, user achievement progress |
| `support` | обращения, сообщения, блокировки и workflow поддержки | `support_*` |
| `donations` | каталоги валют, wallets, donations и verification events | `donation_*`, `donations` |
| `analytics` | посещения, сессии и проекции бизнес-событий для аналитики | `site_visit_events`, `user_sessions`, `game_activity_events` |
| `assets` | безопасная загрузка, хранение и выдача файлов | `uploaded_assets`, файловое хранилище |
| `admin` | admin HTTP transport, navigation и композиция admin use cases | не владеет доменными таблицами |
| `integrations` | адаптеры внешних провайдеров: Telegram, email, OAuth providers | специфичные integration settings |

### 4.1. Особые границы

`identity` и `users` могут работать с разными колонками таблицы `users`, пока
таблица не будет разделена. Владение бизнес-операциями всё равно остаётся
раздельным: `identity` меняет credentials и login state, `users` меняет профиль
и privacy.

`admin` не является владельцем данных. Он вызывает публичный application API
соответствующего модуля. Универсальный admin resource repository допустим для
read-only таблиц и простых справочников, но не для операций, имеющих
инварианты: активации manifest, выдачи предмета, закрытия обращения, изменения
рейтинга или покупки.

`matchmaking` выбирает игроков и просит `rooms` создать комнату. Он не пишет
напрямую в repository комнат и матчей.

`matches` фиксирует результат матча. `rating` рассчитывает изменение рейтинга
через свой публичный application API. Оба действия могут участвовать в одной
явно переданной транзакции.

## 5. Финальная структура server

```text
server/
  package.json
  package-lock.json
  .env.example

  migrations/
    001_*.sql
    ...

  scripts/
    migrate.js
    worker.js

  src/
    main.js

    app/
      createApp.js
      createHttpServer.js
      createSocketServer.js
      createContainer.js
      registerModules.js
      lifecycle.js

    config/
      env.js
      cors.js
      oauth.js

    modules/
      identity/
        index.js
        domain/
        application/
        infrastructure/
        presentation/

      users/
      friends/
      chat/
      rooms/
      matchmaking/
      matches/
      rating/
      effects/
      cosmetics/
      rewards/
      shop/
      achievements/
      support/
      donations/
      analytics/
      assets/
      admin/
      integrations/

    shared/
      application/
        errors/
        pagination/
        result/

      domain/
        ids/
        time/

      infrastructure/
        database/
          pool.js
          transaction.js
        events/
          outboxRepository.js
          outboxWorker.js
        crypto/
        logging/

      presentation/
        http/
          asyncHandler.js
          errorHandler.js
          response.js
          requestContext.js
        socket/
          socketContext.js
          socketError.js

  tests/
    integration/
    contracts/
    fixtures/

  uploads/
```

В финальном состоянии корневые каталоги `routes`, `controllers`, `services`,
`repositories`, `sockets`, `middleware`, `helpers` и `utils` отсутствуют. Их
код либо принадлежит конкретному модулю, либо перенесён в узко определённый
`shared`.

Миграции остаются в `server/migrations`, потому что это операционные артефакты,
которые последовательно применяются ко всему монолиту. Владельца каждой новой
таблицы необходимо указывать комментарием в migration или документации модуля.

## 6. Внутренняя структура модуля

Сложный модуль использует четыре зоны:

```text
modules/cosmetics/
  index.js

  domain/
    cosmeticItem.js
    inventoryItem.js
    cosmeticTypes.js
    cosmeticErrors.js
    events.js

  application/
    catalog/
      getCatalog.js
    inventory/
      getUserInventory.js
      grantCosmeticItem.js
      revokeCosmeticItem.js
    loadout/
      getUserLoadout.js
      equipCosmeticItem.js
    manifests/
      activateManifest.js

  infrastructure/
    cosmeticCatalogRepository.js
    inventoryRepository.js
    loadoutRepository.js
    manifestRepository.js

  presentation/
    http/
      cosmetics.routes.js
      cosmetics.controller.js
      cosmetics.schemas.js
    admin/
      cosmeticsAdmin.routes.js
      cosmeticsAdmin.controller.js
```

### 6.1. `domain`

Содержит правила, не зависящие от способа доставки и хранения:

- типы и статусы;
- проверки допустимых переходов;
- value objects;
- чистые расчёты;
- определения доменных событий;
- доменные ошибки.

Domain может быть небольшим. Не нужно создавать сущность или класс, если у
модуля пока нет самостоятельного правила.

### 6.2. `application`

Содержит сценарии использования. Use case:

- принимает явный input object;
- проверяет authorization и бизнес-предусловия;
- открывает транзакцию, если операция атомарная;
- вызывает repositories и публичные API других модулей;
- записывает domain events/outbox;
- возвращает transport-neutral результат.

Use case не получает `req`, `res`, `socket` или raw callback Socket.IO.

### 6.3. `infrastructure`

Содержит технические реализации:

- PostgreSQL repositories;
- адаптеры файлового хранилища;
- provider clients;
- mapping database row в application/domain model;
- кеш конкретного модуля.

### 6.4. `presentation`

Содержит способы вызова application API:

- Express routes/controllers;
- Socket.IO handlers;
- admin endpoints;
- webhook handlers;
- validation входного транспортного контракта.

### 6.5. Упрощённый формат для маленького модуля

Если модуль мал, разрешено не создавать пустые каталоги:

```text
modules/effects/
  index.js
  getActiveEffects.js
  effectsRepository.js
  effects.routes.js
  effects.schemas.js
```

При росте он переводится в полную структуру без изменения публичного
`index.js`.

## 7. Правила зависимостей

Разрешённое направление внутри модуля:

```text
presentation -> application -> domain
                      |
                      v
                infrastructure
```

На практике application получает repositories через фабрику модуля или
composition root. Это не означает, что domain импортирует infrastructure.

Обязательные правила:

1. `domain` не импортирует application, infrastructure или presentation.
2. `application` не импортирует presentation.
3. `presentation` не импортирует repository напрямую.
4. Модуль не импортирует внутренние файлы другого модуля.
5. Межмодульное взаимодействие идёт через публичный `index.js` или domain
   event.
6. `shared` не импортирует бизнес-модули.
7. `admin` не обходит application API владельца данных.
8. Repository одного модуля не импортирует repository или service другого.
9. Socket handler и HTTP controller не вызывают друг друга.
10. Код новой архитектуры не импортирует файлы из legacy-каталогов, кроме
    специально обозначенных временных adapters.

Эти правила должны быть закреплены lint/import tests до удаления legacy-кода.

## 8. Composition root и dependency injection

Все глобальные зависимости создаются в одном месте — `app/createContainer.js`:

- config;
- logger;
- database pool;
- clock;
- id generator;
- repositories;
- application services;
- outbox worker;
- email и Telegram adapters.

Используется простая ручная композиция функций, без DI framework:

```js
const cosmetics = createCosmeticsModule({
    pool,
    logger,
    clock,
    outbox,
})
```

Это позволяет в тестах передать fake repository, fixed clock и test event
collector. Глобальный `pool` не должен импортироваться application use case
напрямую.

## 9. Application API и транспорт

### 9.1. HTTP flow

```text
Express route
  -> auth middleware
  -> request schema
  -> controller
  -> application use case
  -> repository / other public module API
  -> response mapper
```

Controllers должны оставаться короткими. Стандартный response envelope проекта
сохраняется, но формируется общим HTTP helper.

### 9.2. Socket.IO flow

```text
socket event
  -> socket identity/context
  -> payload schema
  -> application use case
  -> socket presenter
  -> callback / room emit
```

Socket.IO — transport, а не event bus бизнес-домена. Событие `match:end`,
отправляемое клиенту, и доменное событие `match.finished.v1` являются разными
контрактами.

### 9.3. Background worker flow

```text
outbox polling
  -> claim event
  -> event handler use case
  -> transaction
  -> mark processed / schedule retry
```

Worker может запускаться внутри web process на первом этапе, но должен иметь
отдельный lifecycle и возможность позже запускаться командой `npm run worker`.

## 10. Validation, authorization и ошибки

### 10.1. Validation

- Transport validation выполняется через Zod schema.
- Нормализация query, params и body происходит до вызова use case.
- Domain повторно защищает критические инварианты независимо от transport.
- Конфигурации из БД, включая manifests и reward conditions, валидируются при
  записи и при чтении перед исполнением.

### 10.2. Identity и authorization

Middleware только устанавливает нормализованный actor:

```js
{
  userId,
  role,
  sessionId,
  isAuthenticated
}
```

Проверка наличия сессии может быть transport middleware. Проверка «может ли
этот пользователь экипировать конкретный предмет» является правилом use case.

### 10.3. Ошибки

Application/domain бросают типизированные ошибки с устойчивым `code`, например:

```text
COSMETICS.ITEM_NOT_FOUND
COSMETICS.ITEM_NOT_OWNED
COSMETICS.MANIFEST_INVALID
REWARDS.RULE_NOT_ACTIVE
```

HTTP и Socket.IO отдельно преобразуют одну ошибку в свой контракт. Внутренние
тексты PostgreSQL не возвращаются клиенту.

## 11. PostgreSQL и транзакции

### 11.1. Явная транзакционная граница

Общий helper предоставляет:

```js
await withTransaction(pool, async (tx) => {
    // repositories получают tx явно
})
```

Repository принимает `db`, которым может быть pool или transaction client.
Repository сам не начинает скрытую транзакцию, если use case координирует
несколько операций.

### 11.2. Атомарные бизнес-операции

В одной транзакции должны выполняться операции, которые не могут существовать
частично:

- завершение матча, фиксация игроков и изменение рейтинга;
- выдача inventory item и запись inventory event;
- покупка, списание средств и выдача предмета;
- создание reward execution и награды;
- переключение активного manifest;
- создание support reply и изменение статуса обращения, когда это один use
  case.

### 11.3. Идемпотентность

Повтор HTTP-запроса, socket event или outbox delivery не должен создавать
повторный необратимый эффект. Для критических команд вводится idempotency key и
unique constraint на уровне БД.

Для награды ключ может иметь вид:

```text
reward:<ruleId>:<domainEventId>:<recipientUserId>
```

## 12. Доменные события и transactional outbox

### 12.1. Что является доменным событием

Доменное событие описывает уже произошедший бизнес-факт:

```text
identity.user_registered.v1
matches.match_finished.v1
matches.match_won.v1
matches.solo_record_updated.v1
rating.tier_reached.v1
cosmetics.item_granted.v1
shop.purchase_completed.v1
```

Название события не должно содержать предполагаемое действие обработчика.
`matches.match_won.v1` правильно, `give_winner_skin` неправильно.

### 12.2. Контракт события

Каждое событие имеет:

- уникальный `eventId`;
- стабильный `type` с версией;
- `occurredAt`;
- `actorUserId`, если применимо;
- `recipientUserId`, если событие относится к одному получателю;
- `aggregateType` и `aggregateId`;
- `correlationId` и `causationId`;
- versioned payload;
- уникальный deduplication key для повторяемых producers.

Контракт события определяется в коде и проверяется Zod schema. БД хранит
каталог доступных типов и административную конфигурацию, но не исполняемый код.

### 12.3. Почему не используется только `EventEmitter`

In-process event emitter не гарантирует доставку при падении процесса и создаёт
проблемы при нескольких экземплярах backend. Он допустим для локальных
неважных уведомлений после commit, но не для экономики, рейтинга и наград.

Producer записывает outbox row в той же транзакции, что и бизнес-изменение.
Worker обрабатывает события с retry. Повторная доставка безопасна благодаря
идемпотентности consumer.

### 12.4. Награды по событиям

`rewards` содержит один универсальный consumer. Он:

1. Получает domain event.
2. Загружает активные reward rules по `event type`.
3. Валидирует разрешённые декларативные conditions.
4. Определяет зарегистрированного recipient.
5. Проверяет repeat policy, период активности и cooldown.
6. Вызывает `cosmetics.grantCosmeticItem`.
7. Записывает execution result.

Отдельный listener на каждый скин не создаётся.

## 13. Realtime и runtime state

Не всё runtime-состояние обязано становиться domain entity в PostgreSQL.

- Socket connection, typing и краткоживущая очередь могут жить в памяти.
- Состояние комнаты должно иметь repository abstraction, даже если первая
  реализация использует память плюс PostgreSQL snapshot.
- Match result, покупки, inventory и reward executions всегда persistent.
- Client-facing emit выполняется после успешной бизнес-операции.
- Ошибка emit не должна откатывать уже зафиксированную транзакцию.

При горизонтальном масштабировании in-memory реализации заменяются Redis или
другим adapter без изменения application API.

## 14. Admin API

Admin frontend остаётся отдельным приложением, но backend admin-слой становится
тонким transport adapter.

Допустимо сохранить metadata-driven read API для списков, фильтров и
пагинации. Изменяющие операции делятся на два типа:

1. Простое CRUD справочника без сложных инвариантов.
2. Явная команда доменного модуля.

Для второго типа создаются endpoints вроде:

```text
POST /api/admin/cosmetics/manifests/:id/activate
POST /api/admin/cosmetics/users/:userId/grant
POST /api/admin/rewards/rules
POST /api/admin/support/requests/:id/close
```

Они вызывают те же application use cases, что и остальные transports, с actor
администратора. Каждое изменение пишется в admin audit.

## 15. Логи, аудит и наблюдаемость

Вместо разрозненных `console.log` вводится структурированный logger. Каждый
запрос и событие получает context:

- `requestId` или `socketEventId`;
- `correlationId`;
- `userId`;
- `module`;
- `operation`;
- `durationMs`;
- безопасный error code.

Секреты, JWT, password hash, verification code, raw OAuth token и приватный
payload в лог не попадают.

Различаются:

- технический log;
- доменный audit;
- admin audit;
- аналитическое событие;
- пользовательское realtime notification.

Одна сущность не должна подменять все эти назначения.

## 16. Стратегия тестирования

### 16.1. Unit tests

Проверяют чистый domain и application use cases с fake dependencies:

- правила экипировки;
- repeat policy награды;
- расчёт рейтинга;
- выбор победителя;
- нормализацию manifest;
- authorization rules.

### 16.2. Repository integration tests

Запускаются против PostgreSQL test database и проверяют:

- SQL mapping;
- constraints;
- блокировки;
- транзакционный rollback;
- идемпотентность;
- конкурентную обработку outbox.

### 16.3. Transport contract tests

Проверяют Express и Socket.IO контракты без повторного тестирования всех
бизнес-веток:

- status и response envelope;
- auth middleware;
- validation;
- mapping application errors;
- socket callback и emits.

### 16.4. Обязательное правило миграции

До переноса модуля фиксируются characterization tests его текущего поведения.
После переноса старый и новый entrypoint должны проходить один контрактный
набор тестов.

## 17. Naming и кодовые соглашения

- Модули и каталоги: `kebab-case` или существующий единый выбранный стиль;
  внутри проекта нельзя смешивать стили произвольно.
- Use cases называются глаголом: `registerUser`, `finishMatch`,
  `grantCosmeticItem`.
- Repository methods отражают persistence operation, но не HTTP:
  `findItemByKey`, `insertInventoryItem`, `updateLoadout`.
- HTTP handlers не получают суффикс `Service`.
- События используют namespace, прошедший факт и версию:
  `matches.match_finished.v1`.
- Database columns остаются `snake_case`, JavaScript contract использует
  `camelCase`; mapping выполняется на границе repository.
- Не создаются файлы `helper.js`, `utils.js` или `common.js` без узкого
  предметного имени.
- Один файл не должен становиться реестром несвязанных use cases. При росте
  ответственности файл делится по вертикальным сценариям.

## 18. Стратегия перехода без большого переписывания

Используется подход Strangler Fig: новый модуль постепенно заменяет старый, а
внешние API сохраняют контракт.

Для каждого шага действуют правила:

1. Сначала тестируется текущее поведение.
2. Создаётся новый module API.
3. Переносится один законченный vertical slice.
4. Старый route или socket handler временно вызывает новый use case.
5. Проверяется REST/socket contract и работа БД.
6. Старый код удаляется только после исчезновения импортов.
7. Механический перенос и изменение бизнес-поведения по возможности делаются
   разными commits.
8. Каждая фаза должна оставлять server запускаемым и пригодным к deploy.

## 19. Пошаговый план миграции

Ниже приведён обязательный порядок. Одна фаза может состоять из нескольких
небольших задач и commits.

### Фаза 1. Защитная сетка и инвентаризация

- Зафиксировать все REST routes, socket events, background operations и таблицы.
- Добавить characterization tests критических auth, match и admin flows.
- Зафиксировать response envelope и error contracts.
- Составить карту legacy imports между слоями.

Результат: поведение, которое нельзя случайно потерять при переносе, покрыто
минимальными контрактными тестами.

### Фаза 2. Новый bootstrap и composition root

- Создать `src/main.js` и `src/app`.
- Разделить создание Express app, HTTP server и Socket.IO server.
- Вынести lifecycle запуска и graceful shutdown.
- Подключить существующие legacy routers и sockets через временные adapters.

Результат: новый bootstrap запускает старое приложение без изменения API.

### Фаза 3. Shared foundation

- Перенести config/env validation.
- Ввести request context, typed application errors и единый error mapping.
- Создать `database/pool` и `withTransaction`.
- Ввести structured logger.
- Добавить import-boundary tests.

Результат: новые модули не используют старые `helpers`, `utils` и глобальный
pool напрямую.

### Фаза 4. Модуль `identity`

- Перенести регистрацию и password login.
- Перенести email verification и password reset.
- Перенести OAuth login/linking и auth accounts.
- Перенести auth cookie/session policies.
- Оставить старые `/api/authentication` URL без изменения.

Результат: вся идентификация имеет один application API и покрыта тестами.

### Фаза 5. Модуль `users`

- Перенести `me`, публичный профиль и avatar.
- Перенести account settings и privacy.
- Разделить identity credentials и профильные операции.
- Ввести единый actor/authorization context для HTTP и sockets.

Результат: профиль не зависит от auth controllers и repositories напрямую.

### Фаза 6. Модули `assets` и `integrations`

- Перенести uploaded assets и безопасную файловую выдачу.
- Оформить email, Telegram и OAuth providers как adapters.
- Убрать прямой доступ доменных use cases к SDK и filesystem.

Результат: внешние системы заменяемы в тестах и не протекают в domain.

### Фаза 7. Новый модуль `cosmetics`

- Реализовать catalog, manifests, inventory и loadout в новой структуре.
- Создать единый `grantCosmeticItem`.
- Добавить manifest validation.
- Подключить user и admin API через application use cases.

Результат: первое новое большое направление не добавляет код в legacy-папки.

### Фаза 8. Event foundation и модуль `rewards`

- Добавить versioned domain event contracts.
- Добавить transactional outbox, retry и dead-letter policy.
- Добавить event type catalog, reward rules и executions.
- Реализовать идемпотентный consumer наград.
- Добавить admin API управления правилами.

Результат: награды настраиваются в БД, но исполняются безопасным кодом сервера.

### Фаза 9. Модуль `friends`

- Перенести friend requests, permissions и friend state.
- Объединить REST и Socket.IO вокруг одних use cases.
- Отделить persistent friendship от realtime presence projection.

Результат: socket handlers перестают обращаться к repositories напрямую.

### Фаза 10. Модуль `chat`

- Перенести conversations, messages и read state.
- Оставить encryption отдельным infrastructure/domain service.
- Разделить persistent message commands и ephemeral typing events.
- Сохранить текущие Socket.IO contracts.

Результат: chat становится независимым vertical module.

### Фаза 11. Модули `support` и `donations`

- Собрать создание, ответ и закрытие support request в явные use cases.
- Подключить Telegram webhook как presentation adapter.
- Отделить donations от общего support controller.
- Запретить admin обходить workflow прямым CRUD.

Результат: пользовательский, admin и Telegram transports используют одну
бизнес-логику.

### Фаза 12. Модули `effects` и `rating`

- Перенести каталог эффектов и его cache policy.
- Перенести rank tiers, leaderboard queries и rating calculations.
- Отделить чистый расчёт рейтинга от SQL persistence.
- Подготовить публичный rating API для завершения матча.

Результат: match repository больше не импортирует rating repository/service.

### Фаза 13. Модуль `rooms`

- Ввести repository interface для room state.
- Перенести create/join/leave/ready/team/settings use cases.
- Оставить Socket.IO handlers тонкими.
- Изолировать snapshot persistence и восстановление комнат.

Результат: lobby socket adapter не владеет бизнес-правилами комнаты.

### Фаза 14. Модуль `matchmaking`

- Перенести queue и party state за application API.
- Разделить подбор, создание комнаты и client notifications.
- Ввести idempotent join/leave/search commands.
- Подготовить storage adapter на случай нескольких server instances.

Результат: matchmaking не пишет напрямую в room/match repositories.

### Фаза 15. Модуль `matches`

- Перенести создание, старт, завершение и abandonment матча.
- Выделить `finishMatch` как одну транзакционную операцию.
- Подключить rating через публичный module API.
- Публиковать `match_finished` и `match_won` через outbox.
- Разделить match domain event и клиентский `match:end` emit.

Результат: `game.handlers` и `matchRepository` больше не оркестрируют весь
результат матча.

### Фаза 16. Модуль `analytics`

- Перенести sessions, visits и game activity.
- Перевести некритическую аналитику на consumers доменных событий.
- Отделить persistent analytics от realtime activity feed.
- Добавить retention и privacy rules.

Результат: analytics не вмешивается в критические игровые транзакции.

### Фаза 17. Декомпозиция `admin`

- Разделить огромные admin controller и repository.
- Оставить общий read model engine только там, где он безопасен.
- Все domain mutations направить в публичные module use cases.
- Подключить единый admin audit и authorization policies.

Результат: admin является transport/composition layer, а не вторым backend
внутри backend.

### Фаза 18. Модули `shop` и `achievements`

- Реализовать shop offers и purchase transaction.
- Выдавать покупку только через `grantCosmeticItem`.
- Реализовать achievement definitions/progress.
- Публиковать achievement events и подключить reward rules.

Результат: магазин и достижения используют уже готовые cosmetics, rewards и
outbox foundations.

### Фаза 19. Удаление legacy-структуры

- Удалить временные adapters и re-exports.
- Удалить пустые root `routes/controllers/services/repositories/sockets`.
- Запретить legacy import paths в CI.
- Обновить `docs/architecture-ru.md`, API и websocket документацию.
- Выполнить полный regression и migration test.

Результат: физическая структура проекта соответствует этому документу.

## 20. Definition of Done для каждой фазы

Фаза считается завершённой, только если:

- внешний REST/Socket.IO контракт сохранён или изменение отдельно
  задокументировано;
- новый код соблюдает dependency rules;
- нет прямых transport -> repository вызовов;
- критические use cases покрыты unit tests;
- SQL покрыт integration tests в объёме риска;
- транзакционные границы и идемпотентность определены;
- логирование не раскрывает секреты;
- старые импорты удалены или помечены временным adapter с задачей удаления;
- server запускается и все существующие тесты проходят;
- документация модуля и ownership данных обновлены.

## 21. Критерии архитектурного решения

Перед добавлением нового файла нужно ответить:

1. Какому бизнес-модулю он принадлежит?
2. Это domain, application, infrastructure или presentation?
3. Почему код должен быть shared, если предлагается `shared`?
4. Через какой публичный API с ним общаются другие модули?
5. Где проходит транзакция?
6. Что произойдёт при повторном запросе или событии?
7. Нужен ли синхронный ответ или допустим outbox?
8. Каким тестом защищено правило?

Если на первый вопрос нет ответа, граница сценария ещё не продумана.

## 22. Итоговая формула backend

```text
HTTP / Socket.IO / Admin / Webhook / Worker
                    |
                    v
            application use case
                    |
          +---------+----------+
          |                    |
          v                    v
       domain          repository / adapter
          |                    |
          +---------+----------+
                    |
                    v
          transaction + outbox
```

Сервер остаётся одним deployable-приложением, но каждый домен имеет владельца,
публичный API и контролируемые зависимости. Новая функциональность создаётся в
целевой структуре, а старый backend переносится последовательно по vertical
slices. Это позволяет улучшать архитектуру одновременно с развитием продукта,
не откладывая скины, награды и магазин до окончания многомесячного
переписывания.
