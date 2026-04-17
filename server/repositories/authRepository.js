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


export const loginUserService = async (email) => {
    const result = await pool.query(
        'SELECT * FROM users WHERE email = $1',
        [email]
    )

    return result.rows[0]
}

export const getUserService = async (id) => {
    const result = await pool.query(
        'SELECT id, email FROM users WHERE id = $1',
        [id]
    )

    return result.rows[0]
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