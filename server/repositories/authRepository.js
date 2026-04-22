import { pool } from '../db/index.js'

export const registerUserRepo = async (username, email, passwordHash, roleId, status = 'pending_verification') => {
    const result = await pool.query(
        `
        INSERT INTO users (role_id, username, email, password_hash, status)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, username, email, status
        `,
        [roleId, username, email, passwordHash, status]
    )

    return result.rows[0]
}

export const checkEmailRepo = async (email) => {
    const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    )

    if (result.rows.length > 0) return true
    else return false
}


export const loginUserRepo = async (email) => {
    const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    )

    return result.rows[0]
}

export const getUserRepo = async (id) => {
    const result = await pool.query(
        'SELECT id, username, email, status, role_id FROM users WHERE id = $1',
        [id]
    )

    return result.rows[0]
}

export const getSocketUserRepo = async (id) => {
    const result = await pool.query(
        `
        SELECT users.id, users.username, users.email, roles.key AS role
        FROM users
        JOIN roles ON roles.id = users.role_id
        WHERE users.id = $1
        LIMIT 1
        `,
        [id]
    )

    return result.rows[0] || null
}

export const registerUserWithVerificationRepo = async ({
    username,
    email,
    passwordHash,
    roleId,
    verificationCodeHash,
    expiresAt,
}) => {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        const userResult = await client.query(
            `
            INSERT INTO users (role_id, username, email, password_hash, status)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, username, email, status
            `,
            [roleId, username, email, passwordHash, 'pending_verification']
        )

        const user = userResult.rows[0]

        await client.query(
            `
            INSERT INTO email_verifications (user_id, email, code_hash, status, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            `,
            [user.id, email, verificationCodeHash, 'pending', expiresAt]
        )

        await client.query('COMMIT')

        return user
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

export const getUserByEmailRepo = async (email) => {
    const result = await pool.query(
        'SELECT id, username, email, status FROM users WHERE email = $1',
        [email]
    )

    return result.rows[0]
}

export const getLatestPendingVerificationByEmailRepo = async (email) => {
    const result = await pool.query(
        `
        SELECT id, user_id, email, code_hash, status, expires_at
        FROM email_verifications
        WHERE email = $1 AND status = 'pending'
        ORDER BY expires_at DESC
        LIMIT 1
        `,
        [email]
    )

    return result.rows[0]
}

export const createEmailVerificationRepo = async ({
    userId,
    email,
    verificationCodeHash,
    expiresAt,
}) => {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        await client.query(
            `
            UPDATE email_verifications
            SET status = 'expired'
            WHERE email = $1 AND status = 'pending'
            `,
            [email]
        )

        const result = await client.query(
            `
            INSERT INTO email_verifications (user_id, email, code_hash, status, expires_at)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, user_id, email, status, expires_at
            `,
            [userId, email, verificationCodeHash, 'pending', expiresAt]
        )

        await client.query('COMMIT')

        return result.rows[0]
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

export const markEmailVerifiedRepo = async ({ userId, verificationId }) => {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        await client.query(
            `
            UPDATE email_verifications
            SET status = 'used', verified_at = NOW()
            WHERE id = $1
            `,
            [verificationId]
        )

        const userResult = await client.query(
            `
            UPDATE users
            SET status = 'active', email_verified_at = NOW()
            WHERE id = $1
            RETURNING id, username, email, status
            `,
            [userId]
        )

        await client.query('COMMIT')

        return userResult.rows[0]
    } catch (error) {
        await client.query('ROLLBACK')
        throw error
    } finally {
        client.release()
    }
}

export const updateUserLastLoginRepo = async (id) => {
    const result = await pool.query(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1 RETURNING id, username, email, status',
        [id]
    )
}
