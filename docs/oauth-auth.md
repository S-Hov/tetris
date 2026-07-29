# OAuth auth

OAuth start and account management live under `/api/identity`. The callback stays under
`/api/authentication` so registered provider URLs do not need to change.

Providers:

- Google: `/api/identity/oauth/google`
- Discord: `/api/identity/oauth/discord`
- Steam: `/api/identity/oauth/steam`
- Yandex: `/api/identity/oauth/yandex`
- VK: `/api/identity/oauth/vk`
- GitHub: `/api/identity/oauth/github`

Callbacks use `/api/authentication/:provider/callback`.

Required environment variables:

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`
- `STEAM_API_KEY`, optional `STEAM_RETURN_URL`
- `YANDEX_CLIENT_ID`, `YANDEX_CLIENT_SECRET`
- `VK_CLIENT_ID`, `VK_CLIENT_SECRET`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
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

- `GET /api/identity/oauth/:provider`
- `GET /api/authentication/:provider/callback`
- `GET /api/identity/me`
- `POST /api/identity/logout`
- `POST /api/identity/password/login`
- `POST /api/identity/password/set`
- `GET /api/identity/connections`
- `POST /api/identity/connections/:provider/link`
- `DELETE /api/identity/connections/:provider/unlink`

Existing email/password routes remain available:

- `POST /api/identity/register`
- `POST /api/identity/login`
- `PATCH /api/identity/me/password`

## Security

- OAuth state is signed with `JWT_SECRET` and mirrored in an `httpOnly`, `SameSite=Lax` cookie.
- Post-login redirects are checked against `CLIENT_URL` and optional `OAUTH_REDIRECT_WHITELIST`.
- JWT payload contains `userId`; middleware normalizes it to `req.user.id` for existing code.
- Deleting the last login method is blocked. A user must keep either a password or at least one external provider.
- Email/password login for OAuth-only users returns a dedicated error asking them to use external login or set a password.
