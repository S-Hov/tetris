# PVP Tetris

Русскоязычная документация по устройству проекта лежит в
[`docs/architecture-ru.md`](docs/architecture-ru.md).

Проект состоит из двух основных приложений:

| Часть | Технологии | Роль |
| --- | --- | --- |
| `client/` | React 19, Vite, React Router, Socket.IO Client | UI, страницы, игровой экран, клиентская Tetris-логика |
| `server/` | Express, Socket.IO, PostgreSQL, JWT, bcrypt | REST API, авторизация, матчи, рейтинг, realtime-комнаты |

Короткая ментальная модель:

| Слой | За что отвечает |
| --- | --- |
| Frontend pages | Маршруты, формы, экраны выбора режима, лобби, матч |
| Shared frontend | `apiClient`, auth context, socket session, общие UI-компоненты |
| Tetris feature | Доска, фигуры, игровой цикл, управление, эффекты, панели матча |
| REST API | Профиль, авторизация, история матчей, solo record, leaderboard |
| Socket API | Комнаты, matchmaking, party, live-синхронизация состояния игры |
| Persistence | PostgreSQL-таблицы пользователей, матчей, команд, игроков, рейтинга |

## Локальный запуск

В репозитории нет рабочего root-скрипта: корневой `package.json` сейчас пустой.
Запускать части нужно отдельно.

```bash
cd server
npm install
npm run db:migrate
node server.js
```

```bash
cd client
npm install
npm run dev
```

По умолчанию клиент ожидает сервер на `http://<host>:8880`, если не задан
`VITE_API_URL`.

## Важные входные точки

| Файл | Зачем нужен |
| --- | --- |
| `client/src/main.jsx` | Монтирует React, auth provider и router |
| `client/src/app/routing/routes.js` | Полная карта страниц |
| `client/src/pages/Match/MatchPage.jsx` | Главный экран игры, склеивает движок, UI и сокеты |
| `client/src/features/tetris/model/tetrisEngine.js` | Основная игровая логика Tetris |
| `client/src/shared/api/socket/index.js` | Socket.IO client, guest session, socket auth payload |
| `server/server.js` | Express + HTTP + Socket.IO bootstrap |
| `server/sockets/index.js` | Подключение socket middleware и обработчиков |
| `server/sockets/lobby.socket.js` | Приватные комнаты и ready-flow |
| `server/sockets/matchmaking.socket.js` | Очередь поиска, party и автоматическое создание матча |
| `server/sockets/game.handlers.js` | `game:update`, `game:over`, `ability:use` |

Миграции БД описаны в [`docs/db-migrations.md`](docs/db-migrations.md).

## Текущее состояние

Проект уже содержит работающие контуры solo, 1v1, частичный 2v2,
профиль, историю матчей и leaderboard. Режимы `5v5`, `royale` и турниры
присутствуют в UI-каталоге как будущие сценарии, но полноценной игровой
логики для них в коде пока нет.
