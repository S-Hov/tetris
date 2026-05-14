# OAuth auth

Backend OAuth support lives under `/api/authentication` and `/api/settings`.

Providers:

- Google: `/api/authentication/google`
- Discord: `/api/authentication/discord`
- Steam: `/api/authentication/steam`
- Yandex: `/api/authentication/yandex`
- VK: `/api/authentication/vk`

Callbacks use `/api/authentication/:provider/callback`.

Required environment variables:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`
- `STEAM_API_KEY`, optional `STEAM_RETURN_URL`
- `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`
- `VK_CLIENT_ID`, `VK_CLIENT_SECRET`
- `JWT_SECRET`, `CLIENT_URL`, `SERVER_URL`
- Optional `OAUTH_REDIRECT_WHITELIST`
- Optional `OAUTH_STORE_TOKENS=true` when provider tokens are actually needed later

## Data model

Migration `server/migrations/009_oauth_accounts_schema.sql` changes:

- `users.email` is nullable for providers that do not return email, especially Steam.
- `users.password_hash` is nullable for OAuth-only accounts.
- `accounts` stores provider links.

`accounts` fields:

- `id`
- `user_id`
- `provider`
- `provider_account_id`
- `access_token`
- `refresh_token`
- `created_at`
- `updated_at`

Important constraints:

- `UNIQUE (provider, provider_account_id)`
- `UNIQUE (user_id, provider)`
- `accounts.user_id -> users.id ON DELETE CASCADE`

## Login rules

OAuth callback resolves a provider identity to one local user:

1. Find `accounts` by `provider + provider_account_id`.
2. If found, issue a JWT cookie for the linked user.
3. If not found and the provider returned a verified email, link to an existing user with that email.
4. Otherwise create a new user. Steam can create a user without email.
5. Create the `accounts` record and issue a JWT cookie.

Unverified provider emails are not used for account linking. Tokens are stored only when `OAUTH_STORE_TOKENS=true`; by default `access_token` and `refresh_token` stay `NULL`.

## Routes

- `GET /api/authentication/:provider`
- `GET /api/authentication/:provider/callback`
- `GET /api/authentication/me`
- `POST /api/authentication/logout`
- `POST /api/authentication/password/login`
- `POST /api/authentication/password/set`
- `GET /api/settings/connections`
- `POST /api/settings/connections/:provider/link`
- `DELETE /api/settings/connections/:provider/unlink`

Existing email/password routes remain available:

- `POST /api/authentication/register`
- `POST /api/authentication/login`
- `PATCH /api/authentication/me/password`

## Security

- OAuth state is signed with `JWT_SECRET` and mirrored in an `httpOnly`, `SameSite=Lax` cookie.
- Post-login redirects are checked against `CLIENT_URL` and optional `OAUTH_REDIRECT_WHITELIST`.
- JWT payload contains `userId`; middleware normalizes it to `req.user.id` for existing code.
- Deleting the last login method is blocked. A user must keep either a password or at least one external provider.
- Email/password login for OAuth-only users returns a dedicated error asking them to use external login or set a password.
