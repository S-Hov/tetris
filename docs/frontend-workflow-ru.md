# Frontend Workflow Guide

Документация описывает, как работать с клиентской частью PVP Tetris. Это не учебник React с нуля, а практическое соглашение по этому проекту: куда класть код, как думать о компонентах, как использовать hooks, как оформлять формы и секции.

## 1. Главная идея клиентской архитектуры

Клиент находится в `client/` и собран на React + Vite.

React в этом проекте стоит понимать так:

```txt
UI = функция(state, props, context, route params)
```

Компонент не "инициализируется один раз и живет как объект". React вызывает функцию компонента заново при изменении состояния, props, context или данных роутера. На каждом рендере компонент заново вычисляет JSX, а React уже сам решает, какие изменения внести в DOM.

Главная задача разработчика: держать чистый render-код отдельно от работы с внешним миром.

К внешнему миру относятся:

- API-запросы
- socket-события
- timers/intervals
- `localStorage`
- `document.title`
- аналитика
- ручная работа с DOM

Для таких вещей используется `useEffect`.

## 2. Слои проекта

В клиенте используется близкая к Feature-Sliced структура:

```txt
client/src
  app/        # запуск приложения, роутинг, layout-ы, глобальные стили
  pages/      # страницы, привязанные к route
  features/   # пользовательские сценарии и бизнес-фичи
  widgets/    # крупные переиспользуемые секции и блоки
  shared/     # общие hooks, api, context, ui, utils
  i18n/       # инициализация переводов
```

Правило:

- `pages` должны быть тонкими.
- `features` держат конкретный сценарий: auth form, tetris flow, email verification.
- `widgets` держат крупные секции, которые потенциально можно использовать на разных страницах.
- `shared` содержит только то, что действительно общее для проекта.

Если компонент нужен только одной странице, он остается рядом с этой страницей:

```txt
pages/Home/components/HomeHero/
```

Если компонент может понадобиться на разных страницах, он выносится в `widgets`:

```txt
widgets/GameModesSection/
widgets/ArenaDashboardSection/
widgets/SupportProjectSection/
```

## 3. Точка входа приложения

Приложение стартует в `client/src/main.jsx`.

Там React оборачивает весь проект в инфраструктурные компоненты:

```jsx
<React.StrictMode>
  <HelmetProvider>
    <AuthProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AuthProvider>
  </HelmetProvider>
</React.StrictMode>
```

Что это значит:

- `React.StrictMode` помогает находить проблемы в dev-режиме.
- `HelmetProvider` разрешает страницам управлять `<head>`, title, meta, lang.
- `AuthProvider` дает всему приложению доступ к пользователю.
- `BrowserRouter` дает всему приложению роутинг: `Link`, `Navigate`, `useLocation`, `useParams`.

## 4. Роутинг

Карта страниц лежит в:

```txt
client/src/app/routing/routes.js
```

`AppRouter` берет route-конфиг и собирает экран:

```txt
Guard -> Layout -> Page
```

Например для login:

```txt
GuestRoute -> InnerPageLayout -> LoginPage
```

Guard не является настоящей защитой. Он нужен для UX и навигации. Настоящую безопасность всегда должен проверять backend.

Пример:

- `ProtectedRoute` не пускает гостя на приватные страницы.
- `GuestRoute` не пускает авторизованного пользователя на login/register.

Если удалить frontend guard, backend все равно обязан возвращать `401/403` на запрещенные действия.

## 5. Как использовать `useEffect`

`useEffect` запускает побочные эффекты после рендера.

Пример из `AppRouter`:

```jsx
useEffect(() => {
    trackPageView({
        path: `${location.pathname}${location.search}`,
    })
}, [location.pathname, location.search])
```

Как это работает:

1. React рендерит компонент.
2. После рендера запускает effect.
3. При следующем рендере React сравнивает dependencies.
4. Если `location.pathname` или `location.search` изменились, effect запускается снова.

React не следит за переменными в фоне. Он сравнивает старый и новый массив зависимостей между рендерами.

Используйте `useEffect` для:

- загрузки данных при открытии страницы
- подписки и отписки от событий
- запуска и очистки таймеров
- синхронизации языка с URL
- отправки аналитики

Если effect что-то подключает, он должен это отключить:

```jsx
useEffect(() => {
    socket.on('event', handler)

    return () => {
        socket.off('event', handler)
    }
}, [])
```

## 6. AuthProvider и Context

Auth-состояние находится в:

```txt
client/src/shared/context/AuthContext.jsx
client/src/shared/context/AuthContext.js
client/src/shared/hooks/useAuth.js
```

`AuthContext.js` создает context:

```jsx
const AuthContext = createContext(null)
```

`AuthProvider` кладет в context объект:

```jsx
const value = {
    user,
    isAuth: !!user,
    isLoading,
    setUser,
    checkAuth,
    login,
    logout,
}
```

Компоненты ниже по дереву получают его через:

```jsx
const { user, isAuth, login, logout } = useAuth()
```

Главные hooks внутри `AuthProvider`:

- `useState` хранит `user` и `isLoading`.
- `useRef` хранит `authRequestIdRef`, чтобы старые auth-запросы не перезаписали новое состояние.
- `useCallback` делает `checkAuth`, `login`, `logout` стабильными функциями.
- `useMemo` делает context `value` стабильным объектом между рендерами.

`checkAuth` принимает объект опций:

```jsx
async ({ silent = false } = {})
```

Это позволяет вызывать функцию двумя способами:

```jsx
checkAuth()
checkAuth({ silent: true })
```

`silent: true` нужен для фоновой проверки без включения глобального loading.

## 7. API-слой

Большинство REST-запросов должны идти через:

```txt
client/src/shared/api/apiClient.js
```

`apiClient` отвечает за:

- base URL
- cookies через `credentials: 'include'`
- JSON headers
- парсинг ответа
- унификацию ошибок

Исключение: аналитика.

`client/src/shared/api/analytics/index.js` использует прямой `fetch`, потому что это fire-and-forget событие. Там важен `keepalive: true`, чтобы браузер успел отправить page view даже при уходе со страницы. Такие запросы не должны ломать UI, поэтому `.catch(() => {})` там допустим.

Правило:

- обычные бизнес-запросы идут через `apiClient`
- техническая аналитика может иметь отдельный транспорт, если это осознанное исключение

## 8. Эталон форм

Auth-формы считаем эталоном для будущих форм проекта.

Ключевые файлы:

```txt
features/AuthForm/AuthForm.jsx
features/AuthForm/AuthViews.config.js
features/AuthForm/AuthForm.data.js
features/AuthForm/LoginForm.jsx
features/AuthForm/RegisterForm.jsx
shared/ui/Auth/AuthInput/AuthInput.jsx
```

Эталонный подход:

- форма собирается из конфигов
- поля описаны как данные
- общий input-компонент отвечает за внешний вид
- `react-hook-form` управляет состоянием и валидацией
- страница не хранит всю форму внутри себя
- сетевые запросы идут через feature/hook/api, а не смешаны с разметкой

Пример поля:

```js
{
    key: 'email',
    type: 'email',
    placeholder: t('auth.fields.email.placeholder'),
    icon: 'fas fa-envelope',
    validation: {
        required: t('auth.fields.email.required'),
        pattern: {
            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            message: t('auth.fields.email.pattern'),
        },
    },
}
```

Пример рендера:

```jsx
{loginInputs.map((input) => (
    <AuthInput
        key={input.key}
        input={input}
        register={() => register(input.key, input.validation)}
        error={errors[input.key]}
    />
))}
```

Новые формы нужно строить похожим образом.

Не стоит делать большую форму на десяток `useState`, если ее можно описать через config + `react-hook-form`.

## 9. Эталон главной страницы

Главная страница после рефакторинга стала эталоном для секций.

Страница:

```txt
pages/Home/HomePage.jsx
```

Теперь она отвечает только за:

- язык из route params
- SEO через `Helmet`
- композицию секций

Она не хранит внутри себя весь JSX главной.

Текущая структура:

```txt
pages/Home/
  HomePage.jsx
  HomePage.css
  homePage.config.js
  i18n/
  components/
    HomeHero/
      HomeHero.jsx
      HomeHero.css
      homeHero.data.js
      assets/

widgets/
  GameModesSection/
    GameModesSection.jsx
    GameModesSection.css
    homeModes.data.js
    assets/

  ArenaDashboardSection/
    ArenaDashboardSection.jsx
    ArenaDashboardSection.css
    arenaDashboard.utils.js

  SupportProjectSection/
    SupportProjectSection.jsx
    SupportProjectSection.css
    homeDonation.data.js
    assets/
```

Почему так:

- `HomeHero` используется только на главной, поэтому остается рядом с `HomePage`.
- `GameModesSection`, `ArenaDashboardSection`, `SupportProjectSection` потенциально могут использоваться по всему сайту, поэтому лежат в `widgets`.
- стили, картинки и конфиги лежат рядом с компонентами, которым они принадлежат.

Правило для будущих секций:

- если секция нужна только одной странице, кладем в `pages/<Page>/components/<SectionName>`
- если секция переиспользуемая, кладем в `widgets/<SectionName>`
- ассеты секции кладем в `assets` рядом с секцией
- конфиги секции кладем рядом с секцией

## 10. Именование

Для глобальных компонентов не используем имена, привязанные к конкретной странице.

Плохо:

```txt
HomeModes
HomeDashboard
HomeDonation
```

Хорошо:

```txt
GameModesSection
ArenaDashboardSection
SupportProjectSection
```

Такой компонент можно читать как самостоятельный блок сайта, а не как кусок главной страницы.

Рекомендуемые суффиксы:

- `Section` для крупных секций страницы
- `Panel` для информационных панелей
- `Card` для повторяемых карточек
- `Form` для форм
- `Widget` для самостоятельного крупного интерактивного блока

## 11. Как добавлять новую страницу

1. Добавить компонент страницы в `pages/<PageName>/<PageName>Page.jsx`.
2. Добавить маршрут в `app/routing/routes.js`.
3. Выбрать layout: `MainLayout` или `InnerPageLayout`.
4. Если страница приватная, добавить `ProtectedRoute`.
5. Если страница только для гостей, добавить `GuestRoute`.
6. Вынести большие секции в локальные components или global widgets.
7. Положить стили, конфиги и ассеты рядом с компонентами.

Страница должна быть тонкой. Если page-файл становится большим, это сигнал вынести секции или feature.

## 12. Как добавлять новую форму

1. Создать feature, например `features/SupportForm`.
2. Описать поля в `SupportForm.data.js`.
3. Использовать `react-hook-form`.
4. Использовать общий input/select/textarea компонент или создать его в `shared/ui`, если такого еще нет.
5. Сетевой запрос вынести в `shared/api/<domain>`.
6. Странице оставить только подключение формы и SEO.

Эталон: auth-формы.

## 13. Когда использовать hooks

`useState`:
Используем для состояния, которое влияет на UI: loading, error, open/closed, current value.

`useRef`:
Используем для служебной памяти без ререндера или для доступа к DOM.

`useEffect`:
Используем для синхронизации с внешним миром.

`useCallback`:
Используем, когда нужна стабильная ссылка на функцию: context value, effect dependencies, callbacks для дочерних компонентов.

`useMemo`:
Используем для derived data или стабильного object value, особенно если значение идет в context или строится из конфигов.

Не нужно использовать `useMemo` и `useCallback` механически. Они должны решать конкретную проблему: стабильность ссылки, производительность, удобное derived value.

## 14. Что считать кандидатом на рефакторинг

Файл стоит привести к новому стандарту, если:

- page-компонент стал большим
- в странице много ручного JSX для повторяющихся блоков
- форма держится на большом количестве `useState`
- конфиги смешаны с JSX
- картинки лежат далеко от компонента, который их использует
- компонент называется по странице, но по смыслу должен быть глобальным
- API-запросы написаны прямо в UI без доменного wrapper-а

В первую очередь стоит смотреть на крупные страницы с формами и секциями.

## 15. Проверка после изменений

После frontend-рефакторинга запускаем:

```bash
cd client
npm run lint
npm run build
```

Если build предупреждает про большой bundle, это не всегда ошибка. Сейчас в проекте уже есть крупные PNG-ассеты и большой JS chunk. Это отдельное направление оптимизации: code splitting и оптимизация изображений.

## 16. Короткий стандарт проекта

Пиши страницу как сборщик, а не как монолит.

Пиши форму как config + feature + shared UI, а не как набор разрозненных `useState`.

Клади стили, конфиги и ассеты рядом с компонентом, которому они принадлежат.

Выноси в `widgets` только то, что действительно может жить на нескольких страницах.

Держи auth через `AuthProvider` и `useAuth`, а не через локальные проверки по страницам.

Делай обычные REST-запросы через `apiClient`.

Используй `useEffect` только для внешнего мира, а не для вычисления обычных UI-данных.

Называй глобальные компоненты по смыслу, а не по странице, где они впервые появились.
