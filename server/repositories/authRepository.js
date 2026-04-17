import { pool } from '../db/index.js'

export const registerUserRepo = async (email, password) => {
    const result = await pool.query(
        `INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email`,
        [email, password]
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