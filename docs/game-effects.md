# Система игровых эффектов

Этот документ описывает, как в проекте устроены PvP-эффекты Tetris: где лежит
источник правды, как эффект доходит от игрока до соперника, как подключается
визуал и что нужно сделать при добавлении нового эффекта.

## Главный принцип

Игровой движок не должен знать конкретные эффекты. Он хранит только
`activeEffects` и выполняет базовые действия Tetris: движение, вращение, tick,
hard drop, очистку линий. Конкретная механика эффекта живет в отдельной
реализации в `client/src/features/tetris/effects`.

Источник правды для каталога - таблица `game_effects` в PostgreSQL:

- `effect_key` - стабильный ключ эффекта;
- `status` - включен ли эффект;
- `duration_ms` - длительность действия;
- `metadata` - параметры баланса;
- тексты, иконка, изображение, порядок сортировки - данные для UI и админки.

Клиентский код содержит только исполняемую реализацию эффекта: что именно
делать с action, derived state, timed action и presentation.

## Поток online-матча

1. Игрок набирает `energy`.
2. `MatchPage` показывает выбор случайных эффектов из активного каталога.
3. Клиент отправляет `ability:use` с `abilityId`, равным `effect_key`.
4. Сервер в `server/sockets/game.handlers.js` проверяет комнату и достает
   эффект через `getActiveGameEffectByKeyRepo`.
5. Сервер отправляет сопернику `effect:apply`:

```json
{
  "effect": {
    "effectKey": "gravity_lock",
    "type": "gravity_lock",
    "durationMs": 3500,
    "parameters": {
      "speedMultiplier": 3,
      "lockDelayMultiplier": 0.5,
      "lockHorizontalAfterDrop": true
    },
    "sourceSocketId": "socket-id"
  }
}
```

6. Клиент применяет payload через `applyIncomingEffect`.
7. Runtime добавляет эффект в `activeEffects`, нормализует параметры через
   реализацию эффекта и запускает `apply`, если он есть.

## Client runtime

Основные файлы:

| Файл | Назначение |
| --- | --- |
| `effects/catalog.js` | Загружает `/api/effects`, нормализует каталог и фильтрует неподдержанные эффекты |
| `effects/registry.js` | Реестр исполняемых реализаций по `effectKey` |
| `effects/runtime.js` | Общий lifecycle: apply, expiry, action hooks, timed hooks, presentation |
| `effects/presentation/*` | Общие board/screen слои, impact-анимация, dev preview panel |
| `hooks/useTetrisGameLoop.js` | Применяет speed modifiers и timed effects |
| `hooks/useTetrisControls.js` | Прогоняет пользовательские действия через `applyActionWithEffects` |
| `hooks/useMatchSocketSync.js` | Получает `effect:apply` и отправляет `ability:use` |

Реализация эффекта может использовать такие hooks:

| Hook | Когда вызывается | Для чего |
| --- | --- | --- |
| `normalizeParameters(parameters)` | При применении эффекта | Привести `metadata` из БД к безопасным значениям |
| `apply(state, effect, options)` | Сразу после добавления эффекта | Одноразовые эффекты, например `garbage_rain` |
| `beforeAction({ action, effect, state })` | Перед действием игрока | Заблокировать, задержать или заменить action |
| `afterAction({ action, effect, nextState, previousState })` | После действия игрока | Отметить фазу, добавить feedback |
| `modifyDerivedState(derivedState, effect)` | При расчете derived state | Изменить скорость, lock delay или presentation flags |
| `timedIntervalMs(effect)` | При настройке timed effect | Задать период timed action |
| `timedAction(state, effect, context)` | По таймеру | Автоматические события, например случайный поворот |
| `presentation` | При рендере | Подключить board/screen визуал, иконку, подпись, звук |

## Presentation

Визуал разделен на несколько независимых слоев:

- `EffectPresentationLayer` - полноэкранный impact при применении эффекта,
  плашки активных эффектов и screen effects.
- `EffectScreenLayer` - эффекты поверх всего экрана, например `darkness`.
- `EffectBoardLayer` - эффекты поверх игрового поля, например `sticky_walls`,
  `gravity_lock`, `garbage_rain`.
- `effectFeedback` - короткие события реакции: blocked, delayed input, drops,
  rotation pulse. Они могут включить board-анимацию и `audio.feedback`.

Чтобы подключить board effect:

1. Создать компонент рядом с эффектом, например
   `gravity-lock/GravityLockBoardEffect.jsx`.
2. Создать CSS рядом с компонентом.
3. Добавить компонент в `effects/presentation/boardEffectRegistry.js`.
4. В `presentation` эффекта указать `boardEffect: 'gravity-lock'`.

Чтобы подключить screen effect:

1. Создать компонент рядом с эффектом.
2. Добавить его в `effects/presentation/screenEffectRegistry.js`.
3. В `presentation` указать `screenEffect`.

Звук задается в `presentation.audio.apply` и `presentation.audio.feedback`.
Звук исполняется через synth-конфиг в `EffectPresentationLayer`, без отдельных
аудиофайлов.

## Готовые эффекты

| Ключ | Механика | Визуал/звук |
| --- | --- | --- |
| `speed_x2_for_4s` | Ускоряет падение через `modifyDerivedState` | Board-визуал скоростного тоннеля, вертикальные синие линии, сжатие игрового UI и apply-звук |
| `darkness` | Закрывает обзор поля | Полноэкранная тьма, png-туман, flicker UI, apply-звук |
| `garbage_rain` | Сразу добавляет мусорные блоки на поле | Анимация падения блоков в конкретные клетки, feedback-звук |
| `controls_swap` | Меняет left/right actions местами | Board-визуал сбоя управления, apply и feedback-звук |
| `fog_piece` | Прячет next piece preview | Screen/preview fog layer и скрытие next-панели |
| `gravity_lock` | Ускоряет падение и блокирует боковое движение после lock phase | Board-визуал давления, вертикальные синие линии падения, LOCKED-feedback, apply и feedback-звук |
| `screen_shake` | Добавляет shake flag для поля | Board-визуал ударных волн, дрожание поля и игровых панелей, apply-звук |
| `random_rotation` | По таймеру случайно вращает фигуру | Gyro/reticle board-визуал, apply и pulse-звук |
| `sticky_walls` | Блокирует движение, когда фигура касается стены | Липкие светящиеся края, impact при блокировке, apply и feedback-звук |
| `delay_input` | Задерживает пользовательские actions | Countdown поверх поля, apply и feedback-звук |
| `invisible_cells` | Визуально скрывает часть поставленных клеток | Модификатор `TetrisBoard`, отдельного board layer нет |

## Как добавить новый эффект

1. Добавить или обновить строку в `game_effects` через новую миграцию:
   `effect_key`, тексты, `duration_ms`, `status`, `metadata`.
2. Создать папку в `client/src/features/tetris/effects/<effect-name>/`.
3. Реализовать `index.js` с `effectKey`, `normalizeParameters` и нужными hooks.
4. Подключить реализацию в `effects/registry.js`.
5. Если нужен визуал, добавить board/screen компонент и зарегистрировать его.
6. Если нужен звук, добавить `presentation.audio.apply` и/или
   `presentation.audio.feedback`.
7. Добавить или обновить тесты в `effects/effects.test.js`.
8. Проверить dev preview: `/ru/effects/preview?effectPreview=<effect_key>`.

## Dev preview

В dev-режиме отдельная страница preview открывает solo-поле и панель
тестирования эффектов:

```text
/ru/effects/preview?effectPreview=gravity_lock
```

Если `effectPreview` не указан, страница открывает `gravity_lock`. Страница
использует `MatchPage` в solo-режиме, поэтому на ней нет online-комнаты и поля
соперника. Панель `DEV LAB` позволяет переключать эффекты из каталога.

Preview-функционал вынесен из боевой страницы матча. Не добавляйте dev panel в
`MatchPage`; для ручной проверки новых визуалов используйте только отдельный
маршрут `/ru/effects/preview`.
