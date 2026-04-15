import { pool } from '../db/index.js'

export const getProductByIdRepo = async (id) => {
    const result = await pool.query(
        'SELECT * FROM products WHERE id = $1',
        [id]
    )
    return result.rows[0]
}