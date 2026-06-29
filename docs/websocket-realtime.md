# WebSocket и realtime слой

Документ описывает текущую Socket.IO архитектуру public client и backend.
Главная идея: в приложении должен быть один общий Socket.IO client, а разные realtime-задачи
разделяются не отдельными соединениями, а доменами событий: `room:*`, `matchmaking:*`,
`game:*`, `friends:*`, `presence:*`, `activity:*`, `support:*`.

## Модель подключения

На клиенте singleton находится в `client/src/shared/api/socket/index.js`.
Он создается с `autoConnect: false`, поэтому компоненты не должны напрямую вызывать `io()`.

Для авторизованного пользователя приложение поднимает соединение на верхнем уровне через
`client/src/shared/hooks/useAppSocketSession.js`. Для guest-сценариев соединение поднимается
точечно там, где нужен nickname или вход в игровое действие.

`ensureSocketSession({ user, nickname })`:

- собирает auth payload для authenticated или guest режима;
- сравнивает его с текущим payload;
- переподключает socket только если режим или данные сессии изменились;
- возвращает подключенный socket.

На сервере все socket-подключения проходят через `server/sockets/socketAuth.js`.
Если есть валидная JWT cookie, socket получает `socket.user`. Если JWT нет, guest допускается
только с валидными `guestId` и `nickname` из handshake.

Важно: в DevTools может быть видно несколько HTTP-запросов из-за handshake, polling и upgrade
Socket.IO. Это нормально и не означает, что в приложении обязательно несколько socket-клиентов.

## Основные файлы

| Слой | Файл | Назначение |
| --- | --- | --- |
| Client socket | `client/src/shared/api/socket/index.js` | Singleton Socket.IO client, auth/guest handshake |
| Client session | `client/src/shared/hooks/useAppSocketSession.js` | App-level подключение для авторизованного пользователя |
| Friends state | `client/src/shared/realtime/friendsRealtime.js` | Realtime store друзей, заявок и presence |
| Friends hook | `client/src/shared/hooks/useFriendsRealtime.js` | React-подписка на friends realtime store |
| Match sync | `client/src/features/tetris/hooks/useMatchSocketSync.js` | Синхронизация online-матча |
| Ping UI | `client/src/shared/ui/ServerPingIndicator/ServerPingIndicator.jsx` | Измерение ping через уже существующий socket |
| Server bootstrap | `server/server.js` | HTTP server и Socket.IO bootstrap |
| Server sockets | `server/sockets/index.js` | Middleware, подключение доменных handlers, connect/disconnect |
| Socket auth | `server/sockets/socketAuth.js` | JWT/guest авторизация handshake |
| Lobby | `server/sockets/lobby.socket.js` | Комнаты, ready-flow, запуск custom match |
| Matchmaking | `server/sockets/matchmaking.socket.js` | Очередь, party, ranked/casual поиск |
| Game | `server/sockets/game.handlers.js` | `game:update`, `game:over`, abilities/effects |
| Friends | `server/sockets/friends.socket.js` | `friends:state`, `presence:update`, online tracking |
| Friends pushes | `server/services/friendsRealtimeService.js` | Push обновлений после REST-мутаций |
| Activity | `server/services/activityFeedService.js` | Activity feed events |
| Support | `server/sockets/support.socket.js` | Realtime для обращений поддержки |

## Домены событий

### Service

| Event | Направление | Назначение |
| --- | --- | --- |
| `ping:measure` | client -> server -> callback | Измерение latency без создания отдельного соединения |

### Activity

| Event | Направление | Назначение |
| --- | --- | --- |
| `activity:feed:init` | server -> client | Начальный список событий feed |
| `activity:feed` | server -> client | Новое событие feed |

На мобильных экранах activity feed не должен монтироваться, чтобы не создавать лишнюю работу UI.

### Friends и presence

| Event | Направление | Payload | Назначение |
| --- | --- | --- | --- |
| `friends:state:get` | client -> server | callback | Запрос текущего состояния друзей и заявок |
| `friends:state` | server -> client | `{ friends, incomingRequests, outgoingRequests }` | Push полного состояния friends rail/page |
| `presence:update` | server -> client | `{ userId, isOnline }` | Изменение online-статуса друга |

Friends REST API остается источником мутаций: поиск пользователя, отправка заявки,
accept/decline/cancel/remove. После мутации backend вызывает realtime service и отправляет
новый `friends:state` заинтересованным пользователям. Клиентские виджеты не должны возвращать
polling через `setInterval`.

Privacy settings и capabilities действий не передаются через websocket. Клиент получает их через
`GET /api/settings/privacy` и `GET /api/users/:userId/actions`, а socket-handler повторно проверяет
разрешение непосредственно перед отправкой приглашения.

Presence сейчас считается в памяти процесса по активным socket-подключениям пользователя.
Если один пользователь открыл несколько вкладок, offline отправляется только после закрытия
последнего socket.

### Lobby

| Event | Client sends | Server responds/emits |
| --- | --- | --- |
| `room:create` | `{ modeKey, settings }` | callback `{ success, room }`, emit `room:state` |
| `room:join` | `{ roomId }` | callback `{ success, room }`, emit `room:state`, `room:player-joined` |
| `room:leave` | `{ roomId }` | callback, emit `room:left`, `room:state`, `room:player-left` |
| `player:ready` | `{ roomId }` | toggles readiness, may emit `match:start` |
| `room:set-team` | `{ roomId, userId, teamId }` | owner moves player between teams |

### Matchmaking и party

| Event | Client sends | Назначение |
| --- | --- | --- |
| `matchmaking:join` | `{ modeKey, matchType, settings }` | Игрок входит в очередь |
| `matchmaking:leave` | `{}` | Игрок выходит из очереди |
| `matchmaking:searching` | server -> client | Очередь активна |
| `matchmaking:cancelled` | server -> client | Поиск отменен |
| `matchmaking:found` | server -> client | Матч найден |
| `party:create` | `{ modeKey, settings }` | Создание party |
| `party:join` | `{ partyId }` | Вход в party |
| `party:leave` | `{}` | Выход из party |
| `party:start-search` | `{ partyId, matchType }` | Party входит в поиск |
| `party:cancel-search` | `{ partyId }` | Отмена поиска party |
| `party:state` | server -> client | Актуальное состояние party |

### Game

| Event | Направление | Назначение |
| --- | --- | --- |
| `game:update` | client -> server -> opponent | Позиция, board, score и derived состояние игрока |
| `opponent:update` | server -> client | Состояние соперника |
| `ability:use` | client -> server | Игрок применяет ability |
| `effect:apply` | server -> client | Эффект прилетает сопернику |
| `game:over` | client -> server | Игрок завершил игру |
| `match:end` | server -> client | Итог матча |
| `persistence:error` | server -> client | Ошибка сохранения результата |

`effect:apply` использует каталог `game_effects` как источник активности,
длительности и параметров механики:

```json
{
  "effect": {
    "effectKey": "darkness",
    "type": "darkness",
    "durationMs": 10000,
    "parameters": {},
    "sourceSocketId": "socket-id"
  }
}
```

Поле `type` временно дублирует `effectKey` для совместимости со старыми
клиентами. Исполняемая реализация эффекта находится в клиентском реестре.
Подробный контракт описан в [`game-effects.md`](game-effects.md).

### Support

| Event | Направление | Назначение |
| --- | --- | --- |
| `support:join` | client -> server | Подписка на обращение поддержки |
| `support:leave` | client -> server | Отписка от обращения |
| `support:message` | server -> client | Новое сообщение |
| `support:updated` | server -> client | Изменение статуса или метаданных обращения |

## REST или socket

Используй REST, если операция:

- загружает обычную страницу данных;
- создает или изменяет сущность;
- требует валидации формы, поиска, пагинации или истории;
- не обязана моментально пушиться всем открытым вкладкам.

Используй socket, если операция:

- должна прийти без ручного refresh;
- относится к матчу, комнате, очереди, presence, friends state, activity или support chat;
- должна быть доставлена нескольким участникам одной комнаты или заинтересованным пользователям.

Типичный паттерн: REST выполняет мутацию, сервисный слой после успешной записи в БД пушит
актуальное состояние через socket.

## Правила для нового realtime-домена

На клиенте:

- не создавай новый `io()` вне `client/src/shared/api/socket/index.js`;
- вынеси состояние в `client/src/shared/realtime/<domain>Realtime.js`, если им пользуются несколько компонентов;
- сделай hook `use<Domain>Realtime`, чтобы компоненты не работали с socket напрямую;
- всегда чисти подписки в `useEffect` через `socket.off(...)`;
- не добавляй polling в UI-компоненты, если сервер может пушить событие.

На сервере:

- регистрируй handler в `server/sockets/index.js`;
- используй `socket.user` из `socketAuthMiddleware`, не парси JWT вручную в handler;
- для fan-out используй комнаты Socket.IO: `user:<id>`, room id, ticket id, party id;
- для REST-triggered push делай service вида `set<Domain>RealtimeIo(io)` и `emit<Domain>...`;
- callback-ответы держи в формате `{ success, ... }` или `{ success: false, message }`.

## Масштабирование и ограничения

Сейчас часть realtime-состояния живет в памяти Node.js процесса: private rooms, matchmaking queue,
party state и friends presence. Для нескольких backend-инстансов понадобится Redis adapter для
Socket.IO и перенос presence/queue coordination во внешний store.

Activity feed и friends rail должны учитывать мобильную производительность: если секция не нужна
на маленьком экране, она не должна монтироваться и подписываться на события.

## Проверка после изменений

Минимальный набор:

```bash
cd client
npm run lint
npm run build
```

```bash
cd server
npm run build
node --check sockets/friends.socket.js
```

Ручной smoke test:

- открыть две вкладки под разными пользователями;
- проверить online/offline presence друга;
- отправить и принять friend request без refresh;
- создать lobby room, зайти вторым игроком, переключить ready;
- запустить matchmaking/party flow;
- проверить, что ping indicator использует существующее socket-подключение.
