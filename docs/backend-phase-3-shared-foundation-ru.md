# Backend Phase 3: shared foundation

## Статус

Фаза 3 плана из `docs/backend-architecture-v2-ru.md` завершена. Backend получил
общий инфраструктурный фундамент для последующего переноса vertical slices без
изменения публичных REST и Socket.IO контрактов.

Дата завершения: 29 июля 2026 года.

## 1. Конфигурация и validation

Новая точка входа конфигурации находится в `server/src/config/env.js`.

`createConfig(env)`:

- валидирует значения через Zod;
- нормализует `PORT`, database ports и `DB_POOL_MAX` в числа;
- проверяет `NODE_ENV` и `DATABASE_MODE`;
- валидирует database URL;
- нормализует и дедуплицирует CORS origins;
- возвращает immutable config без неизвестных environment variables и секретов.

Невалидная конфигурация останавливает bootstrap с
`EnvironmentValidationError`, содержащей безопасный список полей и ошибок.
Legacy-файлы, которые ещё читают специализированные OAuth, email и integration
variables напрямую, будут переведены на config последовательно вместе с
владеющими ими модулями.

## 2. Request context

`server/src/shared/presentation/http/requestContext.js` создаёт изолированный
контекст каждого HTTP-запроса через `AsyncLocalStorage`.

Контекст содержит:

- `requestId`;
- HTTP method и path;
- время начала запроса;
- расширяемые identity-поля, например `userId`.

Безопасный входящий `x-request-id` сохраняется, иначе создаётся UUID. Идентификатор
возвращается клиенту в response header и автоматически попадает в structured
logs. Параллельные запросы не разделяют context.

## 3. Типизированные ошибки и единый HTTP mapping

Базовый тип `ApplicationError` и предметные типы `ValidationError`,
`NotFoundError`, `ConflictError` находятся в
`server/src/shared/application/errors`.

Application/domain-код использует устойчивый message code и transport-neutral
data. `mapHttpError` централизованно преобразует:

- application errors;
- Zod errors;
- известные PostgreSQL errors;
- неожиданные runtime errors.

Внутренние сообщения PostgreSQL клиенту не возвращаются. Stack неожиданной
ошибки доступен только вне production. Legacy `ApiError` и старый middleware
оставлены тонкими compatibility adapters к новой реализации.

## 4. Database foundation

`server/src/shared/infrastructure/database/pool.js` владеет созданием
PostgreSQL pool и сохраняет прежние правила local/production, SSL и Supabase
pooler.

`withTransaction(pool, operation)` задаёт явную границу:

```js
await withTransaction(pool, async (tx) => {
    await repository.insert(tx, input)
})
```

Helper выполняет `BEGIN`, `COMMIT` или `ROLLBACK` и всегда освобождает client.
При одновременной ошибке операции и rollback возвращается `AggregateError`, не
скрывающий исходную причину.

Legacy `server/db/index.js` временно re-export-ит новый pool. Новым модулям
запрещено импортировать singleton pool: composition root должен передавать им
`db` явно.

## 5. Structured logger

Logger пишет JSON entries с обязательными полями:

- timestamp;
- level;
- service;
- message;
- request context, если он существует;
- предметные structured fields.

Поля с credentials, cookies, passwords, secrets, tokens и API keys
редактируются. Дополнительно маскируются Bearer tokens, credentials в PostgreSQL
URL и секретные query-like значения внутри строк.

HTTP middleware пишет одно событие `request_completed` после завершения ответа
со status и duration. Lifecycle и startup используют тот же logger.

## 6. Import boundaries

Автоматические tests фиксируют следующие правила:

1. `src/modules` не импортируют legacy `controllers`, `services`,
   `repositories`, `helpers`, `utils`, `db`, `routes`, `sockets` и другие
   горизонтальные каталоги.
2. Один модуль не импортирует внутренности другого; доступ разрешён только через
   его `index.js`.
3. Новый модуль не импортирует global pool.
4. `src/shared` зависит только от самого `shared`, `src/config` и внешних
   packages.
5. В shared запрещены dumping-ground имена `common.js`, `helper.js`, `utils.js`.

Эти проверки начинают защищать границы до появления первого модуля в фазе 4.

## 7. Compatibility adapters

Чтобы не менять существующий API одним большим переписыванием, временными
адаптерами являются:

- `server/db/index.js`;
- `server/utils/ApiError.js`;
- `server/utils/asyncHandler.js`;
- `server/middleware/errorHandler.js`;
- `server/middleware/logger.js`.

Legacy routers и sockets продолжают подключаться через phase 2 adapters.
Удаление compatibility paths выполняется по мере переноса модулей и окончательно
в фазе 19.

## 8. Проверки

Фаза покрыта тестами:

- env validation и normalization;
- typed error mapping;
- commit, rollback и release transaction client;
- request id в реальном HTTP contract;
- structured logging и redaction;
- import boundaries;
- полный legacy REST/Socket.IO/database/import baseline.

Команды:

```bash
cd server
npm run build
npm test
npm run architecture:baseline:check
```

## 9. Что намеренно не входит в фазу 3

Фаза не переносит регистрацию, login, OAuth и auth sessions в новый модуль.
Это единый vertical slice фазы 4 `identity`. Также пока не вводятся outbox,
workers и доменные модули следующих фаз.
