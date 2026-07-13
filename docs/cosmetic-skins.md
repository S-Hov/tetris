# Система косметических скинов

Этот документ описывает целевую систему скинов для PVP Tetris: что в проекте
называется скином, как скины хранятся, как попадают в инвентарь игрока, как
выбираются для матча и как безопасно рендерятся на игровом поле.

Документ описывает желаемую архитектуру. Реализацию стоит делать поэтапно, но
сразу держать в голове будущий магазин, достижения, сезонные коллекции и
выдачу предметов игрокам.

## Главная идея

Скин в PVP Tetris - это косметический предмет, который меняет внешний вид
игрового поля и блоков, но не влияет на механику матча.

Скин не должен менять:

- форму фигур;
- размер поля;
- коллизии;
- скорость;
- вероятность выпадения фигур;
- логику очистки линий;
- результат матча.

Скин может менять:

- фон и рамку доски;
- внешний вид пустых клеток;
- внешний вид ghost-клеток;
- внешний вид поставленных и падающих клеток каждого типа фигуры;
- декоративные слои внутри клетки;
- CSS-переменные, цвета, тени, градиенты и изображения;
- preview-изображения в каталоге и магазине.

Текущий Tetris UI хорошо подходит для такой системы: клетки уже имеют
семантику `cell.type` и `cell.variant`, а визуал сейчас задается через CSS
классы вроде `cell--I`, `cell--O`, `filled`, `ghost`. Поэтому скин должен
работать как presentation-слой поверх существующего игрового state.

## Что мы хотим получить

Целевая система должна позволять:

1. Создавать сезонные коллекции скинов, например `Season 1`, `Cyber Arena`,
   `Halloween`.
2. Создавать косметические предметы, которые можно продавать, выдавать за
   достижения, дарить вручную или раздавать по событиям.
3. Хранить у игрока инвентарь полученных предметов.
4. Позволять игроку выбрать активный скин для игры.
5. Загружать в игру только активный выбранный скин, а не весь каталог.
6. Поддерживать три типа визуала:
   - CSS-only;
   - image-based;
   - layered content внутри клетки.
7. Безопасно хранить конфигурацию скина в базе данных.
8. Рендерить сложные визуалы без `dangerouslySetInnerHTML`, без произвольного
   HTML и без исполняемого кода из БД.
9. Версионировать manifest скина, чтобы уже выданные предметы не ломались после
   обновлений.

## Доменные понятия

### Collection

Коллекция - это тематическая группа косметики. Например, первый сезон,
новогодний набор, кибер-арена или награды за турнир.

Коллекция нужна для магазина, фильтров, витрины, редкости и будущих событий.
Она не является тем, что игрок экипирует напрямую.

### Cosmetic item

Косметический предмет - это то, что можно купить, получить или хранить в
инвентаре.

Примеры:

- pack скинов для всех фигур и доски;
- отдельный board skin;
- отдельный piece skin;
- bundle из нескольких предметов.

На старте лучше поддержать основной тип `skin_pack`: один предмет содержит
полный набор визуала для доски и всех типов блоков.

### Skin pack

Skin pack - это косметический предмет, который описывает полный внешний вид
игровой доски:

- скин доски;
- скин пустой клетки;
- скин ghost-клетки;
- скины для `I`, `O`, `T`, `L`, `⅃` и дополнительных типов вроде `garbage`;
- preview для магазина и каталога.

В идеале каждый pack должен иметь fallback для всех типов клеток. Если для
какого-то типа нет отдельного конфига, клиент использует дефолтный визуал.

### Manifest

Manifest - это JSON-описание того, как скин должен выглядеть в игре.

Manifest хранится в БД, но не является произвольным HTML или JS. Это
декларативный формат, который клиент умеет безопасно интерпретировать.

### Inventory item

Inventory item - это конкретная запись владения предметом конкретным игроком.
Даже если два игрока купили один и тот же `cosmetic_item`, у каждого должна
быть своя строка в инвентаре.

Такой подход нужен для будущего:

- источника получения предмета;
- даты получения;
- отзыва предмета;
- серийного номера;
- уникальных атрибутов;
- trade/market mechanics, если они когда-нибудь появятся.

### Loadout

Loadout - это текущий выбор игрока: какой скин сейчас активен в игре.

Loadout должен ссылаться не просто на `cosmetic_item`, а на запись инвентаря,
чтобы игрок мог экипировать только то, чем он владеет.

## Предлагаемая схема БД

Ниже целевая схема. Названия можно уточнить при реализации, но смысл лучше
сохранить.

### `cosmetic_collections`

Сезонные и тематические коллекции.

| Поле | Назначение |
| --- | --- |
| `id` | PK |
| `collection_key` | стабильный машинный ключ |
| `label` | название EN |
| `label_ru` | название RU |
| `description` | описание EN |
| `description_ru` | описание RU |
| `preview_url` | картинка коллекции |
| `status` | `active`, `inactive`, `hidden`, `retired` |
| `sort_order` | порядок показа |
| `metadata` | запас под сезон, даты, промо |
| `created_at`, `updated_at` | аудит времени |

### `cosmetic_items`

Каталог косметических предметов.

| Поле | Назначение |
| --- | --- |
| `id` | PK |
| `item_key` | стабильный машинный ключ |
| `collection_id` | FK на коллекцию |
| `type` | `skin_pack`, `board_skin`, `piece_skin`, `bundle` |
| `rarity` | `common`, `rare`, `epic`, `legendary`, `mythic` |
| `label` | название EN |
| `label_ru` | название RU |
| `description` | описание EN |
| `description_ru` | описание RU |
| `preview_url` | картинка предмета |
| `status` | `active`, `inactive`, `hidden`, `retired` |
| `is_shop_visible` | показывать ли в магазине |
| `is_unlockable` | можно ли получить через достижения/события |
| `tradable` | запас на будущее |
| `marketable` | запас на будущее |
| `giftable` | можно ли дарить |
| `sort_order` | порядок показа |
| `metadata` | произвольные безопасные данные UI |
| `created_at`, `updated_at` | аудит времени |

### `skin_pack_manifests`

Версионированные manifest-файлы скинов.

| Поле | Назначение |
| --- | --- |
| `id` | PK |
| `cosmetic_item_id` | FK на `cosmetic_items` |
| `version` | версия manifest |
| `manifest` | JSONB с конфигом визуала |
| `status` | `draft`, `active`, `archived` |
| `created_at`, `updated_at` | аудит времени |

Для одного `cosmetic_item_id` должен быть только один активный manifest. Старые
версии стоит архивировать, а не удалять.

### `user_inventory_items`

Предметы, которыми владеют игроки.

| Поле | Назначение |
| --- | --- |
| `id` | UUID или BIGSERIAL |
| `user_id` | FK на пользователя |
| `cosmetic_item_id` | FK на предмет |
| `source` | `shop`, `achievement`, `admin_grant`, `event`, `promo` |
| `source_ref` | ссылка на покупку, достижение, событие |
| `status` | `active`, `locked`, `consumed`, `revoked` |
| `attributes` | JSONB под serial, wear, variant и будущие свойства |
| `acquired_at` | когда получено |
| `updated_at` | когда обновлено |

На старте можно запретить дубли одного и того же item у одного пользователя,
если не нужны повторные экземпляры. Но технически лучше оставить возможность
нескольких экземпляров, если в будущем появятся уникальные предметы.

### `user_inventory_events`

Журнал событий инвентаря.

| Поле | Назначение |
| --- | --- |
| `id` | PK |
| `user_id` | игрок |
| `inventory_item_id` | предмет в инвентаре |
| `event_type` | `granted`, `purchased`, `equipped`, `revoked`, `locked` |
| `payload` | детали события |
| `created_at` | время события |

Этот журнал важен для поддержки и будущей экономики: всегда должно быть видно,
почему у игрока появился или исчез предмет.

### `user_cosmetic_loadouts`

Активный выбор игрока.

| Поле | Назначение |
| --- | --- |
| `user_id` | PK и FK на пользователя |
| `active_skin_pack_inventory_id` | FK на `user_inventory_items` |
| `updated_at` | когда изменено |

При сохранении loadout сервер должен проверять:

- предмет принадлежит этому пользователю;
- предмет активен в инвентаре;
- связанный `cosmetic_item` активен;
- у предмета есть активный manifest;
- тип предмета подходит для loadout.

## Manifest скина

Manifest - это runtime-формат, который клиент получает от API и применяет к
`TetrisBoard`.

Пример:

```json
{
  "format": "tetris-skin-pack-v1",
  "board": {
    "renderMode": "layers",
    "style": {
      "--tetris-skin-board-bg": "linear-gradient(180deg, #050914, #101f3a)",
      "--tetris-skin-board-border": "color-mix(in srgb, var(--turquoise) 70%, white)"
    },
    "layers": [
      {
        "type": "image",
        "src": "/uploads/skins/season-1/neon/board-glow.webp",
        "style": {
          "inset": "0",
          "opacity": "0.65",
          "mixBlendMode": "screen"
        }
      }
    ]
  },
  "emptyCell": {
    "renderMode": "css",
    "style": {
      "--tetris-skin-cell-bg": "rgba(255, 255, 255, 0.08)"
    }
  },
  "ghost": {
    "renderMode": "css",
    "style": {
      "--tetris-skin-ghost-opacity": "0.35",
      "--tetris-skin-ghost-border": "1px dashed rgba(0, 246, 255, 0.7)"
    }
  },
  "pieces": {
    "I": {
      "renderMode": "css",
      "style": {
        "--tetris-skin-piece-bg": "linear-gradient(135deg, #00f6ff, #61a8ff)",
        "--tetris-skin-piece-shadow": "0 0 12px rgba(0, 246, 255, 0.7)"
      }
    },
    "O": {
      "renderMode": "image",
      "imageUrl": "/uploads/skins/season-1/neon/o.webp",
      "style": {
        "--tetris-skin-piece-bg-size": "cover"
      }
    },
    "T": {
      "renderMode": "layers",
      "style": {
        "--tetris-skin-piece-bg": "#10162f"
      },
      "layers": [
        {
          "type": "shape",
          "preset": "inner-glow",
          "style": {
            "inset": "12%",
            "background": "rgba(226, 108, 255, 0.32)",
            "borderRadius": "inherit"
          }
        },
        {
          "type": "image",
          "src": "/uploads/skins/season-1/neon/spark.webp",
          "style": {
            "inset": "0",
            "opacity": "0.8",
            "mixBlendMode": "screen"
          }
        }
      ]
    }
  }
}
```

## Три режима рендера

### `css`

Самый легкий режим. Скин задает только CSS-переменные и безопасные style
значения.

Подходит для:

- цветовых тем;
- градиентов;
- свечения;
- простых premium-скинов без картинок.

### `image`

Клетка получает изображение. CSS задает размер, позиционирование и fallback.

Подходит для:

- текстур;
- нарисованных блоков;
- pixel art;
- сезонных или брендированных наборов.

### `layers`

Клетка становится мини-сценой: корневой div `position: relative`, а внутри
него клиент рендерит разрешенные дочерние слои `position: absolute`.

Это дает сложные визуалы без произвольного HTML:

- glow-слои;
- shine-полосы;
- overlay-картинки;
- декоративные рамки;
- внутренние паттерны;
- preset-анимации.

Важно: `layers` не означает, что БД хранит HTML. БД хранит JSON-описание
разрешенных слоев, а клиентский React-компонент сам решает, какие DOM-элементы
создать.

## Безопасность manifest

Manifest из БД нельзя слепо вставлять в DOM.

Запрещено:

- raw HTML;
- `dangerouslySetInnerHTML`;
- JS-код;
- event handlers;
- произвольные className;
- внешние URL без allowlist;
- CSS, который может сломать layout всей страницы;
- `position: fixed`, `z-index` вне разрешенного диапазона;
- `url(...)` внутри произвольного CSS-значения, если оно не прошло проверку.

Разрешать стоит только декларативные поля:

- `renderMode`;
- `imageUrl` и `src` только для `/uploads/...` или заранее разрешенных CDN;
- `layers[]`;
- `style` с whitelist свойств;
- `preset` из заранее известного списка.

Пример whitelist для layer style:

- `inset`;
- `top`, `right`, `bottom`, `left`;
- `width`, `height`;
- `opacity`;
- `background`;
- `border`;
- `borderRadius`;
- `boxShadow`;
- `transform`;
- `filter`;
- `mixBlendMode`;
- `objectFit`;
- `objectPosition`.

Даже разрешенные свойства стоит нормализовать: ограничивать длину строк,
запрещать `javascript:`, `expression`, подозрительные `url(` и слишком тяжелые
фильтры.

## Клиентский runtime

На клиенте стоит ввести отдельный слой:

```text
client/src/features/tetris/skins/
  catalog.js
  normalizeSkinManifest.js
  SkinProvider.jsx
  SkinnedTetrisCell.jsx
  skinRenderer.css
```

### `SkinProvider`

Загружает активный loadout игрока и кеширует manifest по `itemKey + version`.

Для гостя или игрока без скина возвращает дефолтный manifest.

### `SkinnedTetrisCell`

Единый компонент клетки. Он получает:

- `cell`;
- `rowIndex`;
- `cellIndex`;
- `skinPack`;
- `variant`;
- `isClearing`;
- `isInvisible`.

Компонент выбирает конфиг:

1. Если клетка пустая - `skinPack.emptyCell`.
2. Если ghost - `skinPack.ghost` + piece config.
3. Если filled - `skinPack.pieces[cell.type]`.
4. Если конфига нет - fallback на текущие CSS-классы.

### `TetrisBoard`

`TetrisBoard` должен остаться тонким компонентом: grid, board style и список
клеток. Сложность рендера клетки лучше вынести в `SkinnedTetrisCell`.

### `NextPiecePanel`

Сейчас next-piece preview рисует клетки как просто `filled`, без класса типа
фигуры. Для скинов нужно передавать `nextPiece.type` в preview-клетки или
использовать тот же `SkinnedTetrisCell` в компактном режиме.

Иначе активная фигура на поле и preview будут выглядеть по-разному.

## API

Минимальный публичный и пользовательский API:

| Method | URL | Auth | Назначение |
| --- | --- | --- | --- |
| `GET` | `/api/skins/catalog` | optional | Активные коллекции и предметы для каталога/магазина |
| `GET` | `/api/me/inventory/cosmetics` | required | Инвентарь косметики пользователя |
| `GET` | `/api/me/cosmetics/loadout` | required | Активный loadout и manifest |
| `PUT` | `/api/me/cosmetics/loadout` | required | Экипировать предмет |

Для магазина позже:

| Method | URL | Auth | Назначение |
| --- | --- | --- | --- |
| `GET` | `/api/shop/cosmetics` | optional | Витрина магазина |
| `POST` | `/api/shop/cosmetics/:itemKey/purchase` | required | Купить предмет |

Для достижений позже:

```text
achievement unlocked
  -> grantCosmeticItem({ userId, itemKey, source: 'achievement', sourceRef })
  -> user_inventory_items
  -> user_inventory_events
```

## Что грузить в матч

В матч не нужно грузить весь каталог.

Для собственного поля:

- загрузить активный loadout текущего игрока;
- применить manifest к `TetrisBoard` и `NextPiecePanel`.

Для чужих полей есть два варианта:

1. Показывать соперников с дефолтным скином.
2. Передавать в room/player snapshot короткий `equippedSkinPackKey` и грузить
   manifest соперников по ключу.

В любом случае нельзя класть полный manifest в игровой `game_state`. Скин - это
presentation-данные, а не состояние игры.

## Админка

В админке стоит добавить ресурсы:

- `cosmeticCollections`;
- `cosmeticItems`;
- `skinPackManifests`;
- `userInventoryItems` или отдельный экран выдачи предметов.

Для загрузок можно переиспользовать существующий механизм `upload: true` и
`/uploads`. Нужно добавить upload targets:

```js
cosmeticCollections: {
  preview_url: 'skins/collections',
},
cosmeticItems: {
  preview_url: 'skins/items',
},
skinPackManifests: {
  image_url: 'skins',
}
```

Для `skinPackManifests` понадобится редактор JSON с валидацией. Перед переводом
manifest в `active` сервер должен проверять:

- корректный `format`;
- известные `renderMode`;
- только разрешенные piece keys;
- корректные `/uploads/...` URL;
- отсутствие запрещенных CSS-свойств;
- размер manifest;
- наличие fallback или дефолтного поведения.

## Магазин, достижения и выдача

Все источники получения предметов должны сходиться в одну операцию:

```text
grantCosmeticItem({ userId, cosmeticItemId, source, sourceRef, attributes })
```

Эта операция:

1. Проверяет, что item существует и доступен для выдачи.
2. Создает `user_inventory_items`.
3. Пишет событие в `user_inventory_events`.
4. Возвращает созданный inventory item.

Магазин, достижения, промокоды, ручная выдача админом и события не должны
каждый по-своему писать в инвентарь. У них должен быть общий service.

## Версионирование

Manifest стоит версионировать с первого дня.

Причины:

- можно готовить draft новой версии;
- можно откатить сломанный скин;
- можно не ломать уже купленные предметы;
- можно сравнить, какая версия была активна в момент выдачи.

На старте можно упростить: loadout всегда использует текущий active manifest
предмета. Но структура БД должна позволять позже закрепить конкретную версию в
`user_inventory_items.attributes`, если это понадобится.

## Fallback-логика

Скин никогда не должен ломать игру. Если manifest неполный или не загрузилась
картинка, клиент должен спокойно вернуться к дефолтному визуалу.

Порядок fallback:

1. Piece-specific config.
2. Pack-level default piece config.
3. Theme CSS variables.
4. Текущие `.cell--I.filled`, `.cell--O.filled` и т.д.

Для board:

1. `skinPack.board`.
2. Theme board variables.
3. Текущий дефолтный `TetrisBoard.css`.

## Производительность

Клеток на доске немного, но в матче много перерендеров. Поэтому:

- manifest нужно нормализовать один раз после загрузки;
- inline style должен быть компактным;
- картинки должны быть маленькими и оптимизированными;
- layered skins должны иметь ограничение на число слоев;
- анимации должны быть preset-based, а не произвольными;
- тяжелые filter/backdrop-filter эффекты стоит ограничивать;
- для mobile можно отключать самые дорогие слои через manifest flags.

Рекомендуемые лимиты:

- до 4 слоев на клетку;
- до 4 MB на загружаемый ассет, как в текущей админке;
- manifest до 100 KB;
- только `png`, `webp`, `avif`, `svg` для визуалов скинов;
- предпочтительно `webp`/`avif` для текстур.

## Интеграция с текущим проектом

Текущие точки интеграции:

| Место | Что изменить |
| --- | --- |
| `TetrisBoard.jsx` | Добавить `skinPack`, использовать `SkinnedTetrisCell` |
| `TetrisBoard.css` | Оставить дефолтные стили как fallback |
| `NextPiecePanel.jsx` | Передавать тип фигуры в preview или использовать общий cell renderer |
| `MatchPage.jsx` | Загружать active loadout и передавать в board/preview |
| `EffectPreviewPage.jsx` | Поддержать дефолтный или тестовый skin manifest |
| `server/migrations` | Добавить таблицы косметики и инвентаря |
| `server/repositories` | Добавить репозитории каталога, inventory и loadout |
| `server/routes` | Добавить `/api/skins` и `/api/me/cosmetics` |
| `adminResources.js` | Добавить ресурсы для коллекций, items и manifests |

## Этапы внедрения

### Этап 1. Runtime без экономики

- Добавить дефолтный manifest в код.
- Добавить `SkinnedTetrisCell`.
- Научить `TetrisBoard` и `NextPiecePanel` принимать manifest.
- Проверить CSS-only, image и layers режимы на локальном mock manifest.

### Этап 2. Каталог и manifest в БД

- Добавить таблицы `cosmetic_collections`, `cosmetic_items`,
  `skin_pack_manifests`.
- Добавить публичный `GET /api/skins/catalog`.
- Добавить admin resources и загрузку ассетов.
- Добавить серверную валидацию manifest.

### Этап 3. Инвентарь и экипировка

- Добавить `user_inventory_items`, `user_inventory_events`,
  `user_cosmetic_loadouts`.
- Добавить API инвентаря и loadout.
- Добавить UI выбора активного скина в профиле или настройках.
- Матч начинает использовать выбранный loadout.

### Этап 4. Магазин

- Добавить shop endpoint.
- Добавить покупку, которая вызывает общий `grantCosmeticItem`.
- Добавить витрину магазина и проверку владения.

### Этап 5. Достижения и события

- Подключить выдачу скинов за достижения.
- Добавить admin/manual grants.
- Добавить сезонные и event-коллекции.

## Важные решения

1. Скин - это косметический предмет, а не часть игровой механики.
2. В `game_state` не хранится manifest скина.
3. БД хранит декларативный JSON, но не исполняемый frontend-код.
4. Клиент рендерит только разрешенные слои.
5. Магазин, достижения и админская выдача используют общий inventory service.
6. Manifest версионируется.
7. Текущий CSS поля остается fallback, чтобы игра не ломалась из-за скина.

## Краткая формула

Целевая цепочка выглядит так:

```text
cosmetic collection
  -> cosmetic item
  -> active skin pack manifest
  -> user inventory item
  -> user loadout
  -> SkinProvider
  -> TetrisBoard / NextPiecePanel
  -> safe visual renderer
```

Такой подход дает достаточно простую первую реализацию, но не закрывает дорогу
к магазину, достижениям, сезонным коллекциям, редким предметам и более сложной
косметической экономике.
