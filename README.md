# PVP Tetris

PVP Tetris - full-stack проект с публичным клиентом, административной панелью
и Node.js backend для REST API, Socket.IO матчей и PostgreSQL-хранилища.

Подробная русскоязычная карта проекта лежит в
[`docs/architecture-ru.md`](docs/architecture-ru.md).

## Состав репозитория

| Часть | Технологии | Роль |
| --- | --- | --- |
| `client/` | React 19, Vite, React Router, i18next, Socket.IO Client | Публичный сайт, auth, профиль, рейтинг, поддержка, игровые экраны |
| `admin/` | React 19, Vite, React Router, Socket.IO Client | Админ-панель, справочники, пользователи, матчи, поддержка, БД |
| `server/` | Express 5, Socket.IO, PostgreSQL, Passport, JWT, bcrypt, Zod | REST API, OAuth/password auth, realtime-комнаты, матчи, рейтинг, support/donations |
| `docs/` | Markdown, SQL dump | Архитектура, миграции, структура БД, OAuth, frontend workflow |

Короткая ментальная модель:

| Слой | За что отвечает |
| --- | --- |
| Public frontend | Маршруты, локализация, страницы, игровой UI и клиентская Tetris-логика |
| Admin frontend | Дашборд, таблицы ресурсов, редакторы справочников, контроль БД |
| Shared frontend | `apiClient`, auth context, socket session, общие UI-компоненты |
| Tetris feature | Доска, фигуры, игровой цикл, управление, эффекты, панели матча |
| REST API | Auth/OAuth, профиль, настройки, матчи, рейтинг, support, donations, analytics, admin |
| Socket API | Лобби, matchmaking, party, live-синхронизация матча, support realtime |
| Persistence | PostgreSQL-таблицы пользователей, матчей, рейтинга, support/donations, справочников |

## Локальный запуск

В репозитории нет корневого `package.json` со скриптами для всех частей.
Устанавливать зависимости и запускать приложения нужно отдельно.

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

По умолчанию backend слушает `PORT` или `8880`. Клиентские приложения должны
ходить на backend через `VITE_API_URL`; если переменная не задана, public client
использует `http://<host>:8880`.

## Полезные команды

| Где | Команда | Что делает |
| --- | --- | --- |
| `server/` | `npm run dev` / `npm start` | Запускает Express + Socket.IO |
| `server/` | `npm run db:migrate` | Применяет SQL-миграции из `server/migrations/` |
| `server/` | `npm run build` | Проверяет синтаксис `server.js` через `node --check` |
| `client/` | `npm run dev` | Запускает Vite dev server public-клиента |
| `client/` | `npm run build` | Собирает public-клиент |
| `client/` | `npm run lint` | Проверяет public-клиент ESLint |
| `admin/` | `npm run dev` | Запускает Vite dev server админки |
| `admin/` | `npm run build` | Собирает админку |
| `admin/` | `npm run lint` | Проверяет админку ESLint |

## Важные входные точки

| Файл | Зачем нужен |
| --- | --- |
| `client/src/main.jsx` | Монтирует public React-приложение, `HelmetProvider`, `AuthProvider`, router |
| `client/src/app/routing/routes.js` | Карта публичных страниц |
| `client/src/pages/Match/MatchPage.jsx` | Главный экран игры, склеивает движок, UI и сокеты |
| `client/src/features/tetris/model/tetrisEngine.js` | Основная игровая логика Tetris |
| `client/src/shared/api/socket/index.js` | Socket.IO client, guest/auth session |
| `client/src/shared/realtime/friendsRealtime.js` | Realtime store друзей, заявок и presence |
| `admin/src/main.jsx` | Монтирует админское React-приложение |
| `admin/src/app/routing/routes.js` | Карта страниц админки |
| `admin/src/shared/config/adminResources.js` | Конфигурация таблиц и редакторов админ-ресурсов |
| `server/server.js` | Express + HTTP + Socket.IO bootstrap |
| `server/routes/*.js` | REST endpoints |
| `server/sockets/index.js` | Подключение socket middleware и обработчиков |
| `server/sockets/lobby.socket.js` | Приватные комнаты и ready-flow |
| `server/sockets/matchmaking.socket.js` | Очередь поиска, party и создание матчей |
| `server/sockets/game.handlers.js` | `game:update`, `game:over`, `ability:use` |
| `server/sockets/friends.socket.js` | Friends state, requests и presence realtime |

## Документация

| Документ | Описание |
| --- | --- |
| [`docs/architecture-ru.md`](docs/architecture-ru.md) | Архитектура проекта по слоям |
| [`docs/websocket-realtime.md`](docs/websocket-realtime.md) | Socket.IO/realtime contract, event domains и правила REST vs socket |
| [`docs/frontend-workflow-ru.md`](docs/frontend-workflow-ru.md) | Практические правила работы с public frontend |
| [`docs/db-migrations.md`](docs/db-migrations.md) | Как устроены SQL-миграции |
| [`docs/db-structure.md`](docs/db-structure.md) | Справка по структуре БД |
| [`docs/migration-bootstrap.md`](docs/migration-bootstrap.md) | Bootstrap/первый прогон миграций |
| [`docs/oauth-auth.md`](docs/oauth-auth.md) | OAuth providers, routes и модель account linking |

## Текущее состояние

В коде есть работающие контуры solo, 1v1, частичный 2v2, профиль, настройки
аккаунта, история матчей, рейтинг, игровые эффекты, обращения в поддержку,
донаты, OAuth и админ-панель. Режимы `5v5`, `royale` и турниры присутствуют в
UI/каталогах как будущие сценарии, но полноценная backend-логика для них пока
не реализована.
