# Backend Phase 4: модуль identity

## Статус

Фаза 4 плана из `docs/backend-architecture-v2-ru.md` завершена. Все сценарии
идентификации вызываются через один публичный application API модуля
`server/src/modules/identity`. Client и admin согласованно переведены на
`/api/identity`; response contracts сохранены.

Дата завершения: 29 июля 2026 года.

## 1. Граница модуля

`identity` владеет:

- регистрацией и password login;
- подтверждением email;
- сменой неподтверждённого email;
- password reset и установкой первого password для OAuth account;
- OAuth login, linking, unlinking и списком connections;
- JWT identity и auth cookie policy;
- OAuth state protection и redirect whitelist;
- login history и auth audit events;
- credential-частью таблицы `users`;
- таблицами `accounts`, `email_verifications` и `auth_logs`.

Публичный профиль, avatar, privacy и профильные поля `users` будут выделены в
модуль `users` в фазе 5. До этого несколько legacy profile consumers используют
временный re-export из identity use cases.

## 2. Структура

```text
server/src/modules/identity/
  index.js
  domain/
    passwordPolicy.js
  application/
    createIdentityApplication.js
    identityApplication.js
    identityPorts.js
    identityUseCases.js
    oauthState.js
    oauthUseCases.js
  infrastructure/
    identityDatabase.js
    identityRepository.js
    oauthRepository.js
    oauth/
      oauthProviders.js
  presentation/http/
    authMiddleware.js
    identity.schemas.js
    sessionCookies.js
```

## 3. Единый application API

Другие entrypoints обращаются к frozen `identityApplication`. API явно содержит
сценарии:

- `registerUser`;
- `findPasswordLoginUser` и `confirmLogin`;
- `getSessionUser`;
- `verifyEmail`, `resendVerificationCode`, `changeUnverifiedEmail`;
- `requestPasswordReset`, `getPasswordResetMeta`, `completePasswordReset`;
- `updatePassword`, `setInitialPassword`;
- `handleOAuthLogin`, `getConnections`, `unlinkConnection`;
- `requestAccountEmailChange`, `getLoginHistory`, `createAuthLog`.

HTTP controllers больше не импортируют auth/OAuth services напрямую. REST,
OAuth callback и settings transport вызывают один application API.

Application создаётся через explicit dependencies. Отсутствующий обязательный
port приводит к понятной ошибке конфигурации, а unit tests могут подставить fake
dependencies без Express и PostgreSQL.

## 4. Persistence и транзакции

SQL для identity перенесён в:

- `identityRepository.js`;
- `oauthRepository.js`.

Repositories получают database port, который composition root связывает с
shared PostgreSQL pool. Сам модуль не импортирует global pool или legacy
`server/db/index.js`.

Регистрация вместе с verification record, смена email, подтверждение email и
OAuth linking используют явные транзакционные границы. Repository methods
возвращают прежние row contracts, поэтому внешний transport не изменился.

Временные cross-module ports используются только для данных, владельцы которых
будут перенесены позже: role catalog, rank projection и uploaded assets.

## 5. Session и cookie policy

Auth middleware перенесён в identity presentation layer:

- `checkAuth` проверяет JWT и нормализует `userId` в `id`;
- `optionalAuth` оставляет невалидную или отсутствующую сессию гостевой;
- `checkNotAuth` блокирует guest-only endpoint для валидной сессии;
- authenticated `userId` добавляется в request context для structured logs.

Session cookie сохраняет прежние политики:

- `httpOnly` всегда включён;
- production default — `secure: true`, `sameSite: none`;
- development default — `secure: false`, `sameSite: lax`;
- lifetime задаётся `TOKEN_LIFETIME`;
- optional domain задаётся `COOKIE_DOMAIN`.

Identity-related env values теперь валидируются shared config layer.

## 6. OAuth security

OAuth state:

- подписывается HMAC-SHA256;
- связан с provider и режимом `login`/`link`;
- содержит nonce и десятиминутный TTL;
- сверяется с httpOnly cookie;
- проверяется constant-time сравнением подписи.

Redirect policy разрешает только основной client origin и явный
`OAUTH_REDIRECT_WHITELIST`. Неизвестный origin заменяется безопасным fallback.
OAuth tokens по-прежнему сохраняются только при явном
`OAUTH_STORE_TOKENS=true`.

## 7. Frontend и HTTP-контракты

Public client и admin используют новый namespace:

- `/api/identity/register`;
- `/api/identity/login` и `/password/login`;
- `/api/identity/me`;
- verification и password-reset endpoints;
- `/api/identity/oauth/:provider`;
- `/api/identity/connections/*`;
- `/api/identity/account/email`;
- `/api/identity/account/login-history`.

Единственное намеренное исключение —
`/api/authentication/:provider/callback`. Это канонический handler, а не proxy
или redirect: URL сохранён, потому что зарегистрирован у внешних OAuth
providers. Менять provider settings не требуется.

Отдельный contract test проверяет полный список identity URL после миграции.

## 8. Удалённая legacy-структура

После синхронного обновления frontend удалены:

- `server/services/authService.js`;
- `server/services/oauthService.js`;
- `server/repositories/authRepository.js`;
- `server/repositories/oauthRepository.js`;
- `server/middleware/checkAuth.js`;
- `server/validations/auth.validation.js`;
- `server/utils/authCookie.js`;
- `server/utils/oauthState.js`;
- `server/config/oauthProviders.js`.

Также удалены root auth route и auth/OAuth controllers. HTTP controllers,
routers, schemas, policies, use cases и repositories теперь физически находятся
в `src/modules/identity`. Другие backend consumers используют только публичный
`modules/identity/index.js`.

## 9. Проверки

Фаза покрыта:

- unit tests публичного application API с fake ports;
- password/email domain policy tests;
- session middleware и JWT tests;
- cookie production/development policy tests;
- OAuth state signature, provider scope и expiration tests;
- OAuth redirect whitelist tests;
- полным identity REST route contract test;
- import-boundary tests;
- существующим REST, Socket.IO, database и import regression baseline.

Команды проверки:

```bash
cd server
npm run build
npm test
npm run architecture:baseline:check
```

## 10. Следующая фаза

Фаза 5 создаёт модуль `users` и переносит профиль, avatar и privacy из временно
совместно размещённых identity use cases в отдельную бизнес-границу.
