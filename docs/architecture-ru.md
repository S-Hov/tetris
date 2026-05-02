# Архитектура PVP Tetris

Документ описывает текущее устройство проекта по коду. Он специально написан
как рабочая карта для дальнейшего разбора по слоям: сначала общая картина,
потом маршруты, API, сокеты, игровой движок и места, где проект ещё не
полностью стабилизирован.

## 1. Общая картина

Проект разделён на `client` и `server`.

| Слой | Где находится | Основная задача |
| --- | --- | --- |
| React-приложение | `client/src` | Страницы, формы, лобби, матч, отрисовка игры |
| Tetris feature | `client/src/features/tetris` | Игровая модель, цикл, управление, эффекты, UI матча |
| Shared frontend | `client/src/shared` | Auth context, API-клиенты, socket client, общие компоненты |
| Express API | `server/routes`, `server/controllers`, `server/services` | REST-запросы: auth, profile, matches, leaderboard |
| Socket.IO API | `server/sockets` | Комнаты, matchmaking, party, live-синхронизация |
| PostgreSQL | `server/repositories`, `server/db` | Пользователи, матчи, команды, игроки, рейтинг, события |

Главная идея: сервер решает, кто игрок, где он находится и с кем играет.
Клиент сам считает Tetris-состояние локально, а сервер через сокеты
синхронизирует снапшоты между игроками и сохраняет результат матча.

## 2. Запуск и окружение

Корневые `README.md` и `package.json` были пустыми, поэтому в проекте нет
единой команды запуска. Приложения запускаются отдельно:

```bash
cd server
npm install
node server.js
```

```bash
cd client
npm install
npm run dev
```

Сервер слушает `PORT` или `8880`. Клиент по умолчанию ходит на
`http://<window.location.hostname>:8880`, если не задан `VITE_API_URL`.

Важные переменные сервера:

| Переменная | Для чего |
| --- | --- |
| `PORT` | Порт Express/Socket.IO сервера |
| `APP_NAME` | Имя приложения в логах |
| `JWT_SECRET` | Подпись JWT |
| `TOKEN_LIFETIME` | Срок жизни auth cookie в днях |
| `DB_USERNAME` | Пользователь PostgreSQL |
| `DB_HOST` | Host PostgreSQL |
| `DB_DATABASE` | База PostgreSQL |
| `DB_PASSWORD` | Пароль PostgreSQL |
| `DB_PORT` | Порт PostgreSQL |

## 3. Frontend

Вход в клиент находится в `client/src/main.jsx`: React монтируется в DOM,
оборачивается в `AuthProvider` и `BrowserRouter`.

`client/src/app/App.jsx` добавляет `react-hot-toast` и подключает `AppRouter`.
Все основные страницы описаны в `client/src/app/routing/routes.js`.

| URL | Страница | Назначение |
| --- | --- | --- |
| `/` | `HomePage` | Главная витрина режимов |
| `/login` | `LoginPage` | Вход, доступен гостям |
| `/register` | `RegisterPage` | Регистрация, доступна гостям |
| `/profile` | `ProfilePage` | Профиль, нужен логин |
| `/matches` | `MatchesPage` | История матчей, нужен логин |
| `/matches/:matchId` | `MatchDetailsPage` | Детали матча, нужен логин |
| `/rating` | `RatingPage` | Leaderboard |
| `/verify-email/:email` | `VerifyEmailPage` | Подтверждение email |
| `/game/solo/play` | `GamePage` | Solo-матч через общий `MatchPage` |
| `/game/:mode` | `ModeSelectPage` | Выбор сценария режима |
| `/game/:mode/lobby` | `LobbyPage` | Приватная комната |
| `/game/:mode/party` | `TeamQueuePage` | 2v2 party и поиск |
| `/match/:roomId` | `MatchPage` | Онлайн-матч |

### Auth на клиенте

`AuthProvider` хранит:

| Поле | Значение |
| --- | --- |
| `user` | текущий пользователь или `null` |
| `isAuth` | boolean по `user` |
| `isLoading` | идёт ли проверка сессии |
| `checkAuth` | вызывает `/api/authentication/me` |
| `login` | вызывает login API и кладёт пользователя в state |
| `logout` | вызывает logout API и чистит state |

REST-запросы идут через `client/src/shared/api/apiClient.js`.
Он добавляет `credentials: 'include'`, JSON headers, разбирает unified response
формата `{ success, message, data }` и бросает ошибку при неуспешном ответе.

### Socket session на клиенте

`client/src/shared/api/socket/index.js` создаёт один общий `socket`.
Подключение не стартует автоматически: `autoConnect: false`.

Есть два режима socket auth:

| Режим | Как работает |
| --- | --- |
| Авторизованный игрок | Клиент передаёт `{ mode: 'authenticated' }`, сервер берёт JWT из cookie |
| Гость | Клиент хранит `guestId` и `nickname` в `localStorage`, передаёт их в handshake |

`ensureSocketSession({ user, nickname })` сравнивает новый auth payload со
старым, переподключает socket при необходимости и возвращает подключённый
socket.

## 4. Игровой frontend-слой

Главный игровой экран — `client/src/pages/Match/MatchPage.jsx`.
Он работает и для online, и для solo. Для solo `GamePage` просто вызывает
`MatchPage` с `playMode={MATCH_PLAY_MODES.SOLO}`.

`MatchPage` склеивает:

| Часть | Где |
| --- | --- |
| Игровой state и tick | `useTetrisGameLoop` |
| Клавиатура | `useTetrisControls` |
| Синхронизация online-матча | `useMatchSocketSync` |
| Завершение online-матча | `useMatchResult` |
| Таймер перед стартом | `useGameCountdown` |
| Таймер выбора способности | `useAbilityTimer` |
| Solo mock-дебаффы | `useSoloDebuffTimer` |
| UI поля и панелей | `features/tetris/ui/*` |

### Tetris engine

`client/src/features/tetris/model/tetrisEngine.js` — центр игровой логики.
Он не занимается DOM и сокетами, а принимает state и возвращает следующий
state.

Ключевые функции:

| Функция | Что делает |
| --- | --- |
| `createGameState` | Создаёт новую игру: доска, текущая фигура, следующая фигура, score, energy |
| `restartGame` | Пересоздаёт state |
| `movePiece` | Двигает фигуру с учётом коллизий и эффектов |
| `rotateCurrentPiece` | Поворачивает фигуру |
| `hardDrop` | Роняет фигуру до конца |
| `tickGame` | Основной шаг падения |
| `resolveLineClear` | Завершает очистку линий, начисляет score/energy |
| `resolveAbilityChoice` | Закрывает выбор способности |
| `applyIncomingEffect` | Применяет эффект от соперника |
| `withDerivedState` | Добавляет вычисляемые поля, например скорость |
| `getRenderedBoard` | Возвращает доску с текущей фигурой для UI |

Линии очищаются в два этапа: сначала фигура вмерживается в доску и
выставляется `pendingClear`, потом `useTetrisGameLoop` ждёт
`LINE_CLEAR_ANIMATION_MS` и вызывает `resolveLineClear`.

### Эффекты и способности

Способности описаны в `abilities.data.js`, активные эффекты — в `effects.js`.
Игрок копит `energy`; при достижении 100 открывается выбор из случайных
дебаффов. При выборе online-матч отправляет `ability:use`, сервер проверяет
комнату и отправляет сопернику `effect:apply`.

Текущие эффекты:

| Effect | Поведение |
| --- | --- |
| `speed_x2_for_4s` | Ускоряет падение |
| `darkness` | Затемняет поле |
| `garbage_rain` | Добавляет случайные блоки |
| `controls_swap` | Меняет направление horizontal controls |
| `fog_piece` | Скрывает next piece |
| `gravity_lock` | Ограничивает коррекцию после lock phase |
| `screen_shake` | Трясёт поле |
| `random_rotation` | Иногда поворачивает фигуру автоматически |
| `sticky_walls` | Блокирует horizontal move у стены |
| `delay_input` | Применяет ввод с задержкой |
| `invisible_cells` | Визуально скрывает часть locked cells |

## 5. Backend REST API

Сервер стартует в `server/server.js`:

| Middleware/route | Назначение |
| --- | --- |
| `cors` | Разрешает dev origins `5173` и `5174`, включает credentials |
| `express.json` | JSON body |
| `cookieParser` | JWT cookie |
| `logger` | Логирование запросов |
| `/uploads` | Статика для аватаров |
| `/api/authentication` | Auth routes |
| `/api/matches` | Match routes |
| `/api/leaderboard` | Leaderboard routes |
| `errorHandler` | Unified error response |

### Auth API

| Method | URL | Auth | Что делает |
| --- | --- | --- | --- |
| `POST` | `/api/authentication/register` | Guest only | Создаёт пользователя и email verification |
| `POST` | `/api/authentication/login` | Guest only | Проверяет пароль, статус email, ставит JWT cookie |
| `GET` | `/api/authentication/me` | Optional | Возвращает пользователя или guest session |
| `PATCH` | `/api/authentication/me` | Required | Обновляет username |
| `PUT` | `/api/authentication/me/avatar` | Required | Загружает аватар в `server/uploads/avatars` |
| `POST` | `/api/authentication/logout` | Optional | Чистит cookie |
| `POST` | `/api/authentication/verify-email/:email` | Guest only | Проверяет код |
| `POST` | `/api/authentication/resend-verification-email` | Guest only | Отправляет новый код |
| `GET` | `/api/authentication/verification-time/:email` | Guest only | Возвращает meta по verification |

### Matches API

| Method | URL | Что делает |
| --- | --- | --- |
| `GET` | `/api/matches` | История матчей пользователя, фильтры и пагинация |
| `GET` | `/api/matches/solo/record` | Лучший solo score |
| `POST` | `/api/matches/solo/results` | Сохраняет solo результат, если это новый record |
| `GET` | `/api/matches/:matchId` | Детали матча: команды, игроки, события |

### Leaderboard API

| Method | URL | Что делает |
| --- | --- | --- |
| `GET` | `/api/leaderboard?sort=rating&limit=50` | Возвращает активных игроков и rank stats |

Поддерживаемые sort: `rating`, `wins`, `winRate`, `games`, `mmr`,
`bestSolo`.

## 6. Socket.IO слой

Все socket-подключения проходят через `socketAuthMiddleware`.
Если есть валидная JWT cookie, сервер загружает пользователя из БД.
Если JWT нет или он невалидный, сервер разрешает guest только при валидных
`guestId` и `nickname` в handshake.

`server/sockets/index.js` подключает три группы обработчиков:

| Handler | Файл | Задача |
| --- | --- | --- |
| Lobby | `lobby.socket.js` | Приватные комнаты |
| Game | `game.handlers.js` | Состояние игры, game over, способности |
| Matchmaking | `matchmaking.socket.js` | Очередь, party, подбор |

### Lobby events

| Event | Client sends | Server responds/emits |
| --- | --- | --- |
| `room:create` | `{ modeKey, settings }` | callback `{ success, room }`, emit `room:state` |
| `room:join` | `{ roomId }` | callback `{ success, room }`, emit `room:state`, `room:player-joined` |
| `room:leave` | `{ roomId }` | callback, emit `room:left`, `room:state`, `room:player-left` |
| `player:ready` | `{ roomId }` | toggles readiness, may emit `match:start` |
| `room:set-team` | `{ roomId, userId, teamId }` | owner moves player between teams |

Комната стартует, когда игроков ровно столько, сколько требует режим, команды
заполнены и все игроки готовы.

### Matchmaking events

| Event | Client sends | Что происходит |
| --- | --- | --- |
| `matchmaking:join` | `{ modeKey, matchType, settings }` | Авторизованный игрок входит в очередь |
| `matchmaking:leave` | `{}` | Игрок выходит из очереди |
| `party:create` | `{ modeKey, settings }` | Создаёт party для 2v2 |
| `party:join` | `{ partyId }` | Подключается к party |
| `party:leave` | `{}` | Покидает party |
| `party:start-search` | `{ partyId, matchType }` | Party входит в поиск |
| `party:cancel-search` | `{ partyId }` | Отмена поиска party |

Сервер отправляет:

| Event | Значение |
| --- | --- |
| `matchmaking:searching` | Поиск запущен, есть позиция/размер очереди |
| `matchmaking:cancelled` | Поиск отменён |
| `matchmaking:found` | Матч найден, клиент переходит на `/match/:roomId` |
| `party:state` | Актуальное состояние party |

Сейчас matchmaking явно поддерживает `1v1` и `2v2`. `5v5` и `royale` в
очереди отклоняются.

### Game events

| Event | Client sends | Server behavior |
| --- | --- | --- |
| `game:update` | `{ roomId, payload }` | Сохраняет snapshot игрока в `roomStore`, шлёт `opponent:update` другим |
| `game:over` | `{ roomId, payload }` | Помечает игрока/команду проигравшей, завершает матч |
| `ability:use` | `{ roomId, abilityId }` | Проверяет ability, шлёт сопернику `effect:apply`, пишет event |

Матч завершается через `match:end`. Для ranked/casual комнат сервер удаляет
room из `roomStore` после завершения, для private-комнаты логика позволяет
вернуться в лобби и сыграть ещё.

## 7. Серверная модель данных

В репозитории нет migration/schema файлов, поэтому схема восстановлена по SQL
в `server/repositories`.

| Таблица | Роль |
| --- | --- |
| `roles` | Роли пользователей, минимум роль `user` |
| `users` | Аккаунты, email, password hash, avatar, status |
| `email_verifications` | Коды подтверждения email |
| `auth_logs` | Логи регистрации, входа, выхода и ошибок входа |
| `matches` | Матчи: room id, mode, type, status, timestamps, winner team |
| `match_teams` | Команды внутри матча |
| `match_players` | Игроки матча, score, lines, level, result, left_at |
| `match_events` | События матча, например `ability_used` |
| `user_rank_stats` | Rank points, MMR, wins/losses/draws, best solo score |
| `rating_history` | История изменения рейтинга |

Важно: активные комнаты и party хранятся не в БД, а в памяти Node.js:
`roomStore` и `parties`/`queue` в `matchmaking.socket.js`. После перезапуска
сервера активные комнаты и очередь исчезнут.

## 8. Основные пользовательские сценарии

### Регистрация и вход

1. Пользователь вызывает `POST /register`.
2. Сервер создаёт `users`, `email_verifications`, `user_rank_stats`.
3. Код отправляется через `emailService`.
4. До подтверждения email login вернёт `403 EMAIL_NOT_VERIFIED`.
5. После verify login ставит `httpOnly` cookie `token`.
6. Клиент вызывает `/me` и кладёт пользователя в `AuthProvider`.

### Solo game

1. Пользователь выбирает `/game/solo`.
2. `ModeSelectPage` ведёт на `/game/solo/play`.
3. `GamePage` запускает `MatchPage` в solo-режиме.
4. Socket sync выключен, Tetris считается локально.
5. Если пользователь авторизован, результат отправляется в
   `/api/matches/solo/results`.

### Private room

1. Игрок выбирает room-сценарий.
2. `LobbyPage` вызывает `room:create`.
3. Второй игрок вызывает `room:join` по ID.
4. Игроки жмут ready через `player:ready`.
5. Сервер эмитит `match:start`.
6. Клиенты переходят на `/match/:roomId`.
7. После завершения private-матча можно вернуться в лобби.

### Matchmaking 1v1

1. Авторизованный игрок вызывает `matchmaking:join`.
2. Сервер кладёт entry в `queue`.
3. Когда находится совместимый entry, сервер создаёт room и запись матча.
4. Оба игрока получают `matchmaking:found`.
5. Матч стартует сразу, без ready-flow.

### 2v2

Есть два пути:

| Путь | Как работает |
| --- | --- |
| Solo search | Игрок ищет союзника, потом команда ждёт команду соперников |
| Party search | Два игрока создают party, затем owner запускает поиск |

После нахождения двух команд сервер создаёт room на 4 игрока и запускает
match.

## 9. Реализовано и частично реализовано

| Область | Статус |
| --- | --- |
| Solo classic | Рабочий контур |
| 1v1 private room | Рабочий контур |
| 1v1 casual/ranked matchmaking | Рабочий контур |
| 2v2 room | Частично реализовано |
| 2v2 party/matchmaking | Частично реализовано |
| Rating update | Есть для матчей `counts_for_rating` |
| Match history/details | Есть |
| Leaderboard | Есть |
| 5v5 | UI-макет, backend не поддерживает |
| Royale | UI-макет, backend не поддерживает |
| Tournament | Только ссылка на rating/витринный сценарий |
| DB migrations | В репозитории нет |
| Root scripts | В репозитории нет |

## 10. Технические риски и заметки

| Место | Почему важно 
| --- | --- |
| `roomStore`, `queue`, `parties` в памяти | Перезапуска сервера сбрасывает активные матчи и поиск |
| Нет миграций БД | Новому разработчику сложно поднять PostgreSQL без ручной схемы |
| Корневой `package.json` пустой | Нет единой команды `dev` для client+server |
| Home/catalog показывает будущие режимы | UI может обещать больше, чем backend реально поддерживает |
| Клиент сам считает игру | Для PvP это проще, но сервер не валидирует честность game state |
| Socket auth для guest и registered смешан | Нужно внимательно различать ranked и private сценарии |
| Нет автоматических тестов | Изменения в engine/socket flows легко сломать незаметно |

## 11. Как разбирать проект дальше

Предлагаемый порядок разбора по слоям:

1. Frontend routing и auth: `main.jsx`, `routes.js`, `AuthContext`.
2. REST backend: `server.js`, routes, controllers, services, repositories.
3. Socket session: `shared/api/socket`, `socketAuth.js`, `sockets/index.js`.
4. Lobby и matchmaking: `lobby.socket.js`, `matchmaking.socket.js`, `roomStore.js`.
5. Tetris engine: `tetrisEngine.js` и соседние model-файлы.
6. Match orchestration: `MatchPage`, `useTetrisGameLoop`, `useMatchSocketSync`.
7. Persistence/rating: `matchRepository`, `rankRepository`, `rankRules`.

Практически лучше начинать с `MatchPage` и идти в обе стороны: вниз в
`tetrisEngine` и наружу в socket events. Это быстрее всего связывает UI,
игровую механику и серверную часть в одну картину.
