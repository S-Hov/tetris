import { pool } from "../db/index.js"
import bcrypt from "bcryptjs"

export const registerUserService = async (email, password) => {
    const hashedPassword = await bcrypt.hash(password, 10)
    const result = await pool.query(
        `INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email`,
        [email, hashedPassword]
    )

    return result.rows[0]
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