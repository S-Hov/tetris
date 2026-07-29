import { identityDatabase as pool } from './identityDatabase.js'

export const getAccountByProviderRepo = async ({ provider, providerAccountId }) => {
    const result = await pool.query(
        `
        SELECT
            accounts.id,
            accounts.user_id,
            accounts.provider,
            accounts.provider_account_id,
            accounts.created_at,
            accounts.updated_at
        FROM accounts
        WHERE provider = $1 AND provider_account_id = $2
        LIMIT 1
        `,
        [provider, providerAccountId]
    )

    return result.rows[0] || null
}

export const getUserForOAuthByIdRepo = async (userId) => {
    const result = await pool.query(
        `
        SELECT id, role_id, username, email, password_hash, status, email_verified_at
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [userId]
    )

    return result.rows[0] || null
}

export const getUserForOAuthByEmailRepo = async (email) => {
    const result = await pool.query(
        `
        SELECT id, role_id, username, email, password_hash, status, email_verified_at
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
        `,
        [email]
    )

    return result.rows[0] || null
}

export const findOrCreateOAuthUserRepo = async ({
    provider,
    providerAccountId,
    email,
    emailVerified,
    username,
    avatarUrl,
    accessToken = null,
    refreshToken = null,
    roleId,
}) => {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        const accountResult = await client.query(
            `
            SELECT id, user_id, provider, provider_account_id
            FROM accounts
            WHERE provider = $1 AND provider_account_id = $2
            LIMIT 1
            FOR UPDATE
            `,
            [provider, providerAccountId]
        )

        const existingAccount = accountResult.rows[0]

        if (existingAccount) {
            const userResult = await client.query(
                `
                UPDATE users
                SET last_login_at = NOW(), updated_at = NOW()
                WHERE id = $1
                RETURNING id, role_id, username, email, avatar_url, status, email_verified_at
                `,
                [existingAccount.user_id]
            )

            await client.query('COMMIT')

            return {
                user: userResult.rows[0],
                account: existingAccount,
                isNewUser: false,
                isNewAccount: false,
            }
        }

        let user = null

        if (email && emailVerified) {
            const userResult = await client.query(
                `
                SELECT id, role_id, username, email, avatar_url, status, email_verified_at
                FROM users
                WHERE LOWER(email) = LOWER($1)
                LIMIT 1
                FOR UPDATE
                `,
                [email]
            )

            user = userResult.rows[0] || null
        }

        let isNewUser = false

        if (!user) {
            const canUseEmail = email && emailVerified
                ? !(await client.query(
                    'SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1',
                    [email]
                )).rows[0]
                : false
            const userEmail = canUseEmail ? email : null

            const userResult = await client.query(
                `
                INSERT INTO users (
                    role_id,
                    username,
                    email,
                    password_hash,
                    avatar_url,
                    status,
                    email_verified_at,
                    last_login_at
                )
                VALUES ($1, $2, $3, NULL, $4, 'active', $5, NOW())
                RETURNING id, role_id, username, email, avatar_url, status, email_verified_at
                `,
                [
                    roleId,
                    username,
                    userEmail,
                    avatarUrl,
                    userEmail && emailVerified ? new Date() : null,
                ]
            )

            user = userResult.rows[0]
            isNewUser = true

            await client.query(
                `
                INSERT INTO user_rank_stats (user_id, rank_points, mmr, wins, losses)
                VALUES ($1, 0, 1000, 0, 0)
                ON CONFLICT (user_id) DO NOTHING
                `,
                [user.id]
            )
        } else {
            const userResult = await client.query(
                `
                UPDATE users
                SET
                    avatar_url = COALESCE(avatar_url, $2),
                    status = CASE WHEN status = 'pending_verification' THEN 'active' ELSE status END,
                    email_verified_at = COALESCE(email_verified_at, $3),
                    last_login_at = NOW(),
                    updated_at = NOW()
                WHERE id = $1
                RETURNING id, role_id, username, email, avatar_url, status, email_verified_at
                `,
                [user.id, avatarUrl, emailVerified ? new Date() : null]
            )

            user = userResult.rows[0]
        }

        const accountInsertResult = await client.query(
            `
            INSERT INTO accounts (
                user_id,
                provider,
                provider_account_id,
                access_token,
                refresh_token
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, user_id, provider, provider_account_id, created_at, updated_at
            `,
            [user.id, provider, providerAccountId, accessToken, refreshToken]
        )

        await client.query('COMMIT')

        return {
            user,
            account: accountInsertResult.rows[0],
            isNewUser,
            isNewAccount: true,
        }
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

export const linkOAuthAccountRepo = async ({
    userId,
    provider,
    providerAccountId,
    accessToken = null,
    refreshToken = null,
}) => {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        const accountResult = await client.query(
            `
            SELECT id, user_id, provider, provider_account_id
            FROM accounts
            WHERE provider = $1 AND provider_account_id = $2
            LIMIT 1
            FOR UPDATE
            `,
            [provider, providerAccountId]
        )
        const existingAccount = accountResult.rows[0] || null

        if (existingAccount && Number(existingAccount.user_id) !== Number(userId)) {
            await client.query('ROLLBACK')
            return {
                status: 'belongs_to_other_user',
                account: existingAccount,
            }
        }

        if (existingAccount) {
            await client.query('COMMIT')
            return {
                status: 'already_linked',
                account: existingAccount,
            }
        }

        const result = await client.query(
            `
            INSERT INTO accounts (
                user_id,
                provider,
                provider_account_id,
                access_token,
                refresh_token
            )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, user_id, provider, provider_account_id, created_at, updated_at
            `,
            [userId, provider, providerAccountId, accessToken, refreshToken]
        )

        await client.query('COMMIT')

        return {
            status: 'linked',
            account: result.rows[0],
        }
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

export const getUserConnectionsRepo = async (userId) => {
    const result = await pool.query(
        `
        SELECT
            users.id,
            users.email,
            users.password_hash,
            accounts.id AS account_id,
            accounts.provider,
            accounts.created_at
        FROM users
        LEFT JOIN accounts ON accounts.user_id = users.id
        WHERE users.id = $1
        ORDER BY accounts.provider ASC
        `,
        [userId]
    )

    return result.rows
}

export const countUserAccountsRepo = async (userId) => {
    const result = await pool.query(
        'SELECT COUNT(*)::int AS count FROM accounts WHERE user_id = $1',
        [userId]
    )

    return result.rows[0]?.count || 0
}

export const deleteUserAccountRepo = async ({ userId, provider }) => {
    const result = await pool.query(
        `
        DELETE FROM accounts
        WHERE user_id = $1 AND provider = $2
        RETURNING id, user_id, provider, provider_account_id
        `,
        [userId, provider]
    )

    return result.rows[0] || null
}
