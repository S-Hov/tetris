# Backend Phase 2: bootstrap и composition root

## Статус

Фаза 2 плана из `docs/backend-architecture-v2-ru.md` завершена. Новый bootstrap
запускает существующий REST и Socket.IO backend без изменения публичных
контрактов. Перенос бизнес-модулей в целевую vertical-slice структуру в эту фазу
намеренно не входит.

Дата завершения: 14 июля 2026 года.

## 1. Что изменилось

Раньше `server/server.js` одновременно загружал environment, создавал Express,
настраивал middleware, монтировал routes, создавал HTTP и Socket.IO servers,
запускал фоновые операции и открывал порт. Эти обязанности теперь разделены:

```text
src/main.js
    |
    v
src/app/bootstrap.js
    +-- createContainer.js
    +-- createApp.js
    +-- createHttpServer.js
    +-- createSocketServer.js
    +-- registerModules.js
    `-- lifecycle.js
```

`server.js` оставлен как короткий compatibility entrypoint и делегирует запуск
в `src/main.js`. Команды `npm start` и `npm run dev` используют новый entrypoint
напрямую.

## 2. Composition root

`src/app/createContainer.js` является единственным местом сборки runtime
configuration и инфраструктурных зависимостей bootstrap-уровня. Container
содержит:

- имя приложения, порт, CORS origins и абсолютный путь uploads;
- logger;
- синхронизацию uploads;
- закрытие database pool;
- именованные startup tasks.

Зависимости можно подменить в тестах без запуска production database. DI
framework не вводится: используется явная передача обычного объекта container.

## 3. Express, HTTP и Socket.IO

`createApp` только создаёт и конфигурирует Express application. Порядок legacy
middleware сохранён:

1. `trust proxy` и CORS;
2. JSON и cookie parsing;
3. Passport;
4. request logging;
5. static uploads и fallback handler;
6. legacy HTTP modules;
7. общий error handler.

Express factory не открывает сетевой порт. `createHttpServer` отдельно создаёт
Node.js HTTP server, а `createSocketServer` отдельно создаёт Socket.IO server и
подключает его handlers.

## 4. Временные legacy adapters

`src/app/registerModules.js` является явной границей между новым composition
root и текущей горизонтальной структурой. Он сохраняет прежние mount paths и
подключает существующий socket registry.

Этот файл временный. По мере переноса vertical slices legacy imports должны
заменяться публичными `register*Module` функциями новых модулей. Бизнес-логика в
adapter не добавляется.

## 5. Lifecycle и graceful shutdown

`src/app/lifecycle.js` владеет состояниями runtime:

```text
created -> starting -> running -> stopping -> stopped
                   `-> failed
```

Запуск:

- идемпотентно открывает HTTP port;
- после успешного listen запускает синхронизацию uploads и startup tasks;
- логирует фактически открытый port;
- не превращает некритичный warmup в падение всего приложения.

Остановка:

- идемпотентно прекращает принимать Socket.IO и HTTP connections;
- ожидает уже начатые startup tasks;
- закрывает database pool;
- ограничивает ожидание HTTP connections десятью секундами, после чего
  завершает оставшиеся connections;
- агрегирует ошибки освобождения ресурсов.

`src/main.js` устанавливает обработчики `SIGINT` и `SIGTERM`. Первый сигнал
запускает единственный graceful shutdown; handlers можно снять, что позволяет
проверять их изолированно.

## 6. Устранённый import-time side effect

Legacy `sockets/game.handlers.js` раньше прогревал active effect cache сразу при
импорте модуля. Из-за этого простой import bootstrap мог открыть соединение с
PostgreSQL до запуска lifecycle.

Warmup теперь экспортирован как `warmActiveEffectCache` и зарегистрирован
именованной startup task в container. Таким образом, подключение модулей стало
безопасным для контрактных тестов, а production warmup выполняется после
успешного открытия сервера.

## 7. Сохранённые контракты

После переноса architecture inventory подтверждает:

| Контракт | До фазы 2 | После фазы 2 |
| --- | ---: | ---: |
| REST endpoints | 102 | 102 |
| Incoming Socket.IO events | 31 | 31 |
| Outgoing Socket.IO events | 33 | 33 |
| PostgreSQL tables из migrations | 41 | 41 |

Architecture import graph вырос до 248 edges из-за новых composition-компонентов
и временных legacy adapters. Это ожидаемое промежуточное состояние, а не новый
публичный контракт. Snapshot обновлён после проверки diff.

## 8. Тестовая защита bootstrap

`server/tests/bootstrapContracts.test.js` проверяет:

- нормализацию CORS origins и port configuration;
- реальный запуск на свободном ephemeral port;
- прежний guest contract `GET /api/authentication/me`;
- CORS response;
- однократный запуск uploads sync и startup tasks;
- идемпотентные `start` и `stop`;
- однократное закрытие database dependency;
- graceful shutdown по сигналу и удаление signal handlers;
- работоспособность compatibility entrypoint `server.js`.

Тест не использует production database и не выполняет migrations.

## 9. Что намеренно не сделано

В фазе 2 не вводились:

- новая config validation;
- request context и typed application errors;
- новый database adapter и `withTransaction`;
- structured logger;
- import-boundary rules;
- перенос auth, profile или других бизнес-модулей.

Это задачи фазы 3 и последующих vertical slices. Добавлять их в bootstrap сейчас
означало бы смешать инфраструктурное разделение с изменением поведения.

## 10. Команды проверки

```bash
cd server
npm test
npm run architecture:baseline:check
npm run build
```

## 11. Definition of Done фазы 2

- [x] Создан `src/main.js`.
- [x] Express app отделён от HTTP listen.
- [x] Socket.IO server создаётся отдельной factory.
- [x] Configuration и runtime dependencies собираются в composition root.
- [x] Legacy routers и sockets подключены через временный adapter.
- [x] Реализованы startup tasks и graceful shutdown.
- [x] Обработаны `SIGINT` и `SIGTERM`.
- [x] Удалён database side effect при импорте game handlers.
- [x] Добавлены bootstrap contract tests.
- [x] REST, Socket.IO и database contracts сохранены.

Следующая разрешённая фаза: `Фаза 3. Shared foundation` из целевого
архитектурного документа.
