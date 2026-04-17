import { pool } from "../db/index.js"

export const getRoleByKeyRepo = async (key) => {
    const result = await pool.query(
        'SELECT id, key, name FROM roles WHERE key = $1',
        [key]
    )

    return result.rows[0]
}