# Архитектура PVP Tetris

Документ описывает текущее устройство проекта по коду. Это рабочая карта для
разработчика: где искать слой, какие приложения есть, как связаны REST, Socket.IO,
игровой движок и PostgreSQL.

## 1. Общая картина

Репозиторий разделён на три приложения и набор документации:

| Слой | Где находится | Основная задача |
| --- | --- | --- |
| Public React app | `client/src` | Сайт, страницы, профиль, поддержка, рейтинг, лобби, матч |
| Admin React app | `admin/src` | Админ-панель, dashboard, таблицы ресурсов, редакторы, контроль БД |
| Tetris feature | `client/src/features/tetris` | Игровая модель, цикл, управление, эффекты, UI матча |
| Shared frontend | `client/src/shared`, `admin/src/shared` | Auth context, API-клиенты, socket client, общие компоненты |
| Express API | `server/routes`, `server/controllers`, `server/services` | REST-запросы: auth, profile, matches, leaderboard, support, admin |
| Socket.IO API | `server/sockets` | Комнаты, matchmaking, party, live-синхронизация, support realtime |
| PostgreSQL | `server/migrations`, `server/repositories`, `server/db` | Пользователи, матчи, рейтинг, support/donations, справочники, аналитика |

Главная идея: сервер отвечает за идентичность игрока, комнаты, matchmaking,
результаты, рейтинг и данные админки. Клиент считает Tetris-состояние локально,
а сервер через сокеты синхронизирует снапшоты между игроками и сохраняет итог.

## 2. Запуск и окружение

Корневого скрипта для одновременного запуска всех приложений нет. Части
запускаются отдельно:

```bash
cd server
npm install
npm run db:migrate
npm run dev
```

```bash
cd client
npm install
npm run dev
```

```bash
cd admin
npm install
npm run dev
```

Сервер слушает `PORT` или `8880`. Public client по умолчанию ходит на
`http://<window.location.hostname>:8880`, если не задан `VITE_API_URL`.

Важные переменные сервера:

| Переменная | Для чего |
| --- | --- |
| `PORT` | Порт Express/Socket.IO сервера |
| `APP_NAME` | Имя приложения в логах |
| `JWT_SECRET` | Подпись JWT и OAuth state |
| `TOKEN_LIFETIME` | Срок жизни auth cookie в днях |
| `CLIENT_URL`, `SERVER_URL` | Redirect/origin настройки для OAuth |
| `CORS_ORIGINS` | Список разрешённых origins через запятую |
| `DB_USERNAME`, `DB_HOST`, `DB_DATABASE`, `DB_PASSWORD`, `DB_PORT` | Подключение PostgreSQL |
| `TURNSTILE_SECRET_KEY` | Проверка Cloudflare Turnstile, если включена |
| `EMAIL_*`, `RESEND_API_KEY`, `BREVO_API_KEY` | Отправка email-кодов и писем поддержки |
| `TELEGRAM_BOT_TOKEN`, `ADMIN_TELEGRAM_CHAT_ID` | Telegram-интеграция поддержки |
| `*_CLIENT_ID`, `*_CLIENT_SECRET` | OAuth providers: Google, Discord, Yandex, VK, GitHub |
| `STEAM_API_KEY` | Steam OAuth/OpenID |

## 3. Public frontend

Вход в клиент находится в `client/src/main.jsx`: React монтируется в DOM,
оборачивается в `HelmetProvider`, `AuthProvider` и `BrowserRouter`.

`client/src/app/App.jsx` добавляет `react-hot-toast` и подключает `AppRouter`.
Все основные страницы описаны в `client/src/app/routing/routes.js`.

| URL | Страница | Назначение |
| --- | --- | --- |
| `/:lang` | `HomePage` | Главная витрина |
| `/login` | `LoginPage` | Вход, доступен гостям |
| `/register` | `RegisterPage` | Регистрация, доступна гостям |
| `/:lang/profile` | `ProfilePage` | Профиль, нужен логин |
| `/account-settings`, `/account-settings/:section` | `AccountSettingsPage` | Настройки аккаунта |
| `/matches` | `MatchesPage` | История матчей |
| `/matches/:matchId` | `MatchDetailsPage` | Детали матча |
| `/:lang/rating` | `RatingPage` | Leaderboard |
| `/:lang/about` | `AboutPage` | О проекте |
| `/effects` | `EffectsPage` | Каталог игровых эффектов |
| `/:lang/support` | `SupportPage` | Поддержка и донаты |
| `/support/requests` | `SupportRequestsPage` | Мои обращения |
| `/support/requests/:ticketId` | `SupportRequestDetailsPage` | Детали обращения |
| `/verify-email/:email` | `VerifyEmailPage` | Подтверждение email |
| `/:lang/game/solo/play` | `GamePage` | Solo-матч через общий `MatchPage` |
| `/:lang/game/controls` | `GameSettingsPage` | Настройки управления |
| `/:lang/game/controls/pc` | `PcControlsPage` | Управление для ПК |
| `/:lang/game/controls/mobile` | `MobileControlsPage` | Мобильное управление |
| `/:lang/game/:mode` | `ModeSelectPage` | Выбор сценария режима |
| `/:lang/game/:mode/lobby` | `LobbyPage` | Приватная комната |
| `/:lang/game/:mode/party` | `TeamQueuePage` | 2v2 party и поиск |
| `/match/:roomId` | `MatchPage` | Онлайн-матч |

### Auth на клиенте

`AuthProvider` хранит `user`, `isAuth`, `isLoading`, `checkAuth`, `login`,
`logout` и `setUser`. REST-запросы идут через
`client/src/shared/api/apiClient.js`: он добавляет `credentials: 'include'`,
JSON headers, разбирает unified response `{ success, message, data }` и бросает
ошибку при неуспешном ответе.

### Socket session на клиенте

`client/src/shared/api/socket/index.js` создаёт один общий `socket` с
`autoConnect: false`.

| Режим | Как работает |
| --- | --- |
| Авторизованный игрок | Клиент передаёт `{ mode: 'authenticated' }`, сервер берёт JWT из cookie |
| Гость | Клиент хранит `guestId` и `nickname` в `localStorage`, передаёт их в handshake |

`ensureSocketSession({ user, nickname })` сравнивает новый auth payload со
старым, переподключает socket при необходимости и возвращает подключённый
socket.

## 4. Admin frontend

Админка находится в `admin/` и запускается отдельным Vite-приложением. Входная
точка - `admin/src/main.jsx`, маршруты - `admin/src/app/routing/routes.js`.

Основные страницы:

| URL внутри админки | Страница | Назначение |
| --- | --- | --- |
| `dashboard` | `DashboardPage` | Сводка |
| `users/:userId` | `AdminUserDetailsPage` | Детали пользователя |
| `users/:userId/edit` | `AdminUserEditPage` | Редактирование пользователя |
| `matches/:matchId` | `AdminMatchDetailsPage` | Детали матча |
| `matches/teams/:teamId` | `AdminMatchTeamDetailsPage` | Детали команды |
| `support/requests/:requestId` | `AdminSupportRequestDetailsPage` | Детали обращения |
| `database/schema` | `DatabaseSchemaPage` | Структура БД |
| `database/control` | `DatabaseControlPage` | Контроль миграций/БД |

Большая часть таблиц строится из `admin/src/shared/config/adminResources.js`.
Сейчас там описаны аналитика, сессии, пользователи, роли, auth logs,
email-verifications, матчи, комнаты, игровые эффекты, ранги, support,
donations, audit и migrations.

## 5. Игровой frontend-слой

Главный игровой экран - `client/src/pages/Match/MatchPage.jsx`. Он работает и
для online, и для solo. Для solo `GamePage` вызывает `MatchPage` с
`playMode={MATCH_PLAY_MODES.SOLO}`.

`MatchPage` склеивает:

| Часть | Где |
| --- | --- |
| Игровой state и tick | `useTetrisGameLoop` |
| Клавиатура | `useTetrisControls` |
| Мобильное управление | `useMobileTetrisControls` |
| Синхронизация online-матча | `useMatchSocketSync` |
| Завершение online-матча | `useMatchResult` |
| Таймер перед стартом | `useGameCountdown` |
| Таймер выбора способности | `useAbilityTimer` |
| Solo mock-дебаффы | `useSoloDebuffTimer` |
| UI поля и панелей | `features/tetris/ui/*` |

### Tetris engine

`client/src/features/tetris/model/tetrisEngine.js` - центр игровой логики. Он
не занимается DOM и сокетами, а принимает state и возвращает следующий state.

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

Линии очищаются в два этапа: сначала фигура вмерживается в доску и выставляется
`pendingClear`, потом `useTetrisGameLoop` ждёт `LINE_CLEAR_ANIMATION_MS` и
вызывает `resolveLineClear`.

### Эффекты и способности

Параметры выбора способности лежат в `abilities.data.js`, а исполняемые эффекты -
в `client/src/features/tetris/effects`. Каталог эффектов в БД (`game_effects`)
является источником истины для ключей, активности, длительности, текстов и
параметров баланса. Клиентский реестр `effects/registry.js` хранит только
реализацию механики и presentation-слой.

Игрок копит `energy`; при достижении 100 открывается выбор из случайных
дебаффов из активного каталога. При выборе online-матч отправляет
`ability:use`, сервер проверяет комнату, берет актуальные данные эффекта из
`game_effects` и отправляет сопернику `effect:apply`.

Подробная документация по runtime, визуалам, звуку и добавлению новых эффектов:
[`game-effects.md`](game-effects.md).

## 6. Backend REST API

Сервер стартует в `server/server.js`:

| Middleware/route | Назначение |
| --- | --- |
| `cors` | Разрешает configured origins, включает credentials |
| `express.json` | JSON body |
| `cookieParser` | JWT cookie |
| `passport.initialize()` | OAuth providers |
| `logger` | Логирование запросов |
| `/uploads` | Статика и fallback для загруженных ассетов |
| `/api/authentication` | Auth/password/OAuth routes |
| `/api/settings` | Настройки аккаунта и OAuth connections |
| `/api/users` | HTTP capabilities для действий с пользователями |
| `/api/matches` | Match routes |
| `/api/leaderboard` | Leaderboard routes |
| `/api/analytics` | Page/game analytics |
| `/api/feedback` | Feedback channels |
| `/api/support` | Обращения и donations |
| `/api/effects` | Публичный каталог эффектов |
| `/api/admin` | Admin API |
| `/api/telegram` | Telegram webhook/support интеграция |
| `errorHandler` | Unified error response |

### Auth API

| Method | URL | Auth | Что делает |
| --- | --- | --- | --- |
| `POST` | `/api/authentication/register` | Guest only + Turnstile | Создаёт пользователя и email verification |
| `POST` | `/api/authentication/login` | Guest only | Password login |
| `POST` | `/api/authentication/password/login` | Guest only | Alias password login |
| `GET` | `/api/authentication/me` | Optional | Возвращает пользователя или guest session |
| `PATCH` | `/api/authentication/me` | Required | Обновляет профиль |
| `PATCH` | `/api/authentication/me/password` | Required | Меняет пароль |
| `POST` | `/api/authentication/password/set` | Required | Задаёт пароль OAuth-only аккаунту |
| `PUT` | `/api/authentication/me/avatar` | Required | Загружает avatar/media в `server/uploads` |
| `POST` | `/api/authentication/logout` | Optional | Чистит cookie |
| `GET` | `/api/authentication/:provider` | Guest | Старт OAuth |
| `GET` | `/api/authentication/:provider/callback` | Guest | OAuth callback |
| `POST` | `/api/authentication/verify-email/:email` | Guest only | Проверяет код |
| `POST` | `/api/authentication/change-unverified-email` | Guest only | Меняет email до подтверждения |
| `POST` | `/api/authentication/resend-verification-email` | Guest only | Отправляет новый код |
| `GET` | `/api/authentication/verification-time/:email` | Guest only | Возвращает meta по verification |
| `POST` | `/api/authentication/password-reset` | Guest only | Запрашивает сброс пароля |
| `GET` | `/api/authentication/password-reset/verification-time/:email` | Guest only | Meta по сбросу пароля |
| `POST` | `/api/authentication/password-reset/verify/:email` | Guest only | Завершает сброс пароля |

OAuth подробно описан в [`oauth-auth.md`](oauth-auth.md).

### Matches API

| Method | URL | Что делает |
| --- | --- | --- |
| `GET` | `/api/matches` | История матчей пользователя, фильтры и пагинация |
| `GET` | `/api/matches/solo/record` | Лучший solo score |
| `POST` | `/api/matches/solo/results` | Сохраняет solo результат, если это новый record |
| `GET` | `/api/matches/:matchId` | Детали матча: команды, игроки, события |

### Settings API

| Method | URL | Auth | Что делает |
| --- | --- | --- | --- |
| `GET` | `/api/settings/connections` | Required | Список OAuth connections пользователя |
| `POST` | `/api/settings/connections/:provider/link` | Required | Старт привязки OAuth provider |
| `DELETE` | `/api/settings/connections/:provider/unlink` | Required | Отвязка provider, если остаётся другой способ входа |
| `PATCH` | `/api/settings/account/email` | Required | Запрос смены email |
| `GET` | `/api/settings/account/login-history` | Required | История входов аккаунта |
| `GET` | `/api/settings/privacy` | Required | Настройки приватности пользователя |
| `PATCH` | `/api/settings/privacy` | Required | Частичное обновление настроек приватности |
| `GET` | `/api/users/:userId/actions` | Optional | Доступные действия без раскрытия настроек другого пользователя |

### Leaderboard And Effects API

| Method | URL | Что делает |
| --- | --- | --- |
| `GET` | `/api/leaderboard?sort=rating&limit=50` | Возвращает активных игроков и rank stats |
| `GET` | `/api/effects` | Возвращает активный каталог игровых эффектов |

Поддерживаемые sort для leaderboard: `rating`, `wins`, `winRate`, `games`,
`mmr`, `bestSolo`.

### Support API

| Method | URL | Auth | Что делает |
| --- | --- | --- | --- |
| `POST` | `/api/support/requests` | Optional + Turnstile | Создаёт обращение |
| `GET` | `/api/support/requests/my` | Required | Список обращений пользователя |
| `GET` | `/api/support/requests/my/:ticketId` | Required | Детали обращения |
| `GET` | `/api/support/requests/my/:ticketId/messages` | Required | Сообщения обращения |
| `GET` | `/api/support/donations/wallets` | Public | Активные wallets для донатов |
| `POST` | `/api/support/donations` | Optional + Turnstile | Создаёт запись donation |

## 7. Socket.IO слой

Все socket-подключения проходят через `socketAuthMiddleware`. Если есть
валидная JWT cookie, сервер загружает пользователя из БД. Если JWT нет или он
невалидный, сервер разрешает guest только при валидных `guestId` и `nickname` в
handshake.

`server/sockets/index.js` подключает группы обработчиков:

| Handler | Файл | Задача |
| --- | --- | --- |
| Lobby | `lobby.socket.js` | Приватные комнаты |
| Game | `game.handlers.js` | Состояние игры, game over, способности |
| Matchmaking | `matchmaking.socket.js` | Очередь, party, подбор |
| Support | `support.socket.js` | Realtime для обращений поддержки |
| Friends | `friends.socket.js` | Friends state, requests и presence realtime |

Подробный контракт событий и правила REST/socket описаны в
[`websocket-realtime.md`](websocket-realtime.md).

### Lobby events

| Event | Client sends | Server responds/emits |
| --- | --- | --- |
| `room:create` | `{ modeKey, settings }` | callback `{ success, room }`, emit `room:state` |
| `room:join` | `{ roomId }` | callback `{ success, room }`, emit `room:state`, `room:player-joined` |
| `room:leave` | `{ roomId }` | callback, emit `room:left`, `room:state`, `room:player-left` |
| `player:ready` | `{ roomId }` | toggles readiness, may emit `match:start` |
| `room:set-team` | `{ roomId, userId, teamId }` | owner moves player between teams |

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

Сейчас matchmaking явно поддерживает `1v1` и `2v2`. `5v5` и `royale` в очереди
отклоняются.

### Game events

| Event | Client sends | Server behavior |
| --- | --- | --- |
| `game:update` | `{ roomId, payload }` | Сохраняет snapshot игрока в `roomStore`, шлёт `opponent:update` другим |
| `game:over` | `{ roomId, payload }` | Помечает игрока/команду проигравшей, завершает матч |
| `ability:use` | `{ roomId, abilityId }` | Проверяет ability, шлёт сопернику `effect:apply`, пишет event |

Матч завершается через `match:end`. Для ranked/casual комнат сервер удаляет room
из `roomStore` после завершения; для private-комнаты логика позволяет вернуться
в лобби и сыграть ещё.

## 8. Серверная модель данных

Схема создаётся SQL-миграциями из `server/migrations/`. Runner описан в
[`db-migrations.md`](db-migrations.md), справка по таблицам - в
[`db-structure.md`](db-structure.md).

Основные домены:

| Домен | Таблицы/назначение |
| --- | --- |
| Auth | `roles`, `users`, `email_verifications`, `auth_logs`, `accounts` |
| Matches | `matches`, `match_teams`, `match_players`, `match_events` |
| Rooms | `game_rooms`, `game_room_players` |
| Rating | `user_rank_stats`, `rating_history`, `rank_tiers` |
| Analytics | page visits, game activity, sessions |
| Support | `support_requests`, support messages, feedback channels, support blocks |
| Donations | currencies, networks, currency-network pairs, wallets, donations, verification events |
| Effects | `game_effects` |
| Uploads | uploaded asset metadata and local `/uploads` files |
| Admin/System | admin audit, migrations view/control |

Важно: активные комнаты, queue и party хранятся в памяти Node.js:
`roomStore` и структуры в `matchmaking.socket.js`. После перезапуска сервера
активные матчи и очередь исчезнут.

## 9. Основные пользовательские сценарии

### Регистрация и вход

1. Пользователь вызывает `POST /register`.
2. Сервер проверяет Turnstile, создаёт `users`, `email_verifications`,
   `user_rank_stats`.
3. Код отправляется через `emailService`.
4. До подтверждения email login вернёт ошибку `EMAIL_NOT_VERIFIED`.
5. После verify login ставит `httpOnly` cookie `token`.
6. Клиент вызывает `/me` и кладёт пользователя в `AuthProvider`.

### OAuth login

1. Клиент открывает `/api/authentication/:provider`.
2. Сервер создаёт signed OAuth state и редиректит к provider.
3. Callback ищет `accounts` по `provider + provider_account_id`.
4. Если связи нет, сервер может привязать verified email к существующему
   пользователю или создать нового.
5. Сервер ставит JWT cookie и возвращает пользователя в `CLIENT_URL`.

### Solo game

1. Пользователь выбирает solo.
2. `GamePage` запускает `MatchPage` в solo-режиме.
3. Socket sync выключен, Tetris считается локально.
4. Если пользователь авторизован, результат отправляется в
   `/api/matches/solo/results`.

### Private room

1. Игрок выбирает room-сценарий.
2. `LobbyPage` вызывает `room:create`.
3. Второй игрок вызывает `room:join` по ID.
4. Игроки жмут ready через `player:ready`.
5. Сервер эмитит `match:start`.
6. Клиенты переходят на `/match/:roomId`.

### Matchmaking 1v1 и 2v2

1. Авторизованный игрок вызывает `matchmaking:join` или создаёт party.
2. Сервер кладёт entry в `queue`.
3. Когда находится совместимый entry/команда, сервер создаёт room и запись
   матча.
4. Игроки получают `matchmaking:found`.
5. Матч стартует сразу, без ready-flow.

### Support request

1. Пользователь или гость отправляет `/api/support/requests`.
2. Сервер проверяет Turnstile и support blocks.
3. Обращение сохраняется в БД, для Telegram может создаваться продолжение
   диалога.
4. Авторизованный пользователь видит список и сообщения в `/support/requests`.
5. Админ отвечает из админки, realtime обновления идут через socket support
   слой.

## 10. Реализовано и частично реализовано

| Область | Статус |
| --- | --- |
| Solo classic | Рабочий контур |
| 1v1 private room | Рабочий контур |
| 1v1 casual/ranked matchmaking | Рабочий контур |
| 2v2 room | Частично реализовано |
| 2v2 party/matchmaking | Частично реализовано |
| Rating update | Есть для матчей `counts_for_rating` |
| Match history/details | Есть |
| Leaderboard/rank tiers | Есть |
| Game effects catalog | Есть в коде, БД и админке |
| OAuth | Google, Discord, Steam, Yandex, VK, GitHub |
| Account settings | Профиль, avatar, пароль, OAuth connections |
| Support requests | Есть public flow, my requests, admin flow, messages |
| Donations catalog | Есть справочники и wallets |
| Admin panel | Есть dashboard, resources, details pages, DB pages |
| 5v5 | UI/каталог, backend matchmaking не поддерживает |
| Royale | UI/каталог, backend matchmaking не поддерживает |
| Tournament | Витринный/будущий сценарий |
| Автоматические тесты | Почти отсутствуют; server `npm test` заглушка |

## 11. Технические риски и заметки

| Место | Почему важно |
| --- | --- |
| `roomStore`, `queue`, `parties` в памяти | Перезапуск сервера сбрасывает активные матчи и поиск |
| Клиент сам считает игру | Сервер не валидирует честность Tetris state |
| Socket auth для guest и registered смешан | Нужно внимательно различать ranked и private сценарии |
| Public UI показывает будущие режимы | UI может обещать больше, чем backend реально поддерживает |
| Uploads локальные | Нужна дисциплина синхронизации/хранилища для production |
| Нет полноценного test suite | Engine/socket/admin flows легко сломать незаметно |
| Нет root scripts | Разработчику нужно запускать `server`, `client`, `admin` отдельно |

## 12. Как разбирать проект дальше

Практичный порядок:

1. Public routing и auth: `main.jsx`, `routes.js`, `AuthContext`.
2. REST backend: `server.js`, routes, controllers, services, repositories.
3. Socket session: `shared/api/socket`, `socketAuth.js`, `sockets/index.js`.
4. Lobby и matchmaking: `lobby.socket.js`, `matchmaking.socket.js`, `roomStore.js`.
5. Tetris engine: `tetrisEngine.js` и соседние model-файлы.
6. Match orchestration: `MatchPage`, `useTetrisGameLoop`, `useMatchSocketSync`.
7. Admin resources: `adminResources.js`, `AdminResourcePage`, `adminRepository`.
8. Persistence/rating/support: `matchRepository`, `rankRepository`,
   `supportRepository`, `adminRepository`.

Лучше начинать с `MatchPage` и идти в обе стороны: вниз в `tetrisEngine` и
наружу в socket events. Это быстрее всего связывает UI, механику и серверную
часть в одну картину.
