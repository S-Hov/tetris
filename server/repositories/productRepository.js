import { pool } from '../db/index.js'

export const getProductByIdRepo = async (id) => {
    const result = await pool.query(
        'SELECT * FROM products WHERE id = $1',
        [id]
    )
    return result.rows[0]
}

export const deleteProductRepo = async (id) => {
    const result = await pool.query(
        'DELETE FROM products WHERE id = $1 RETURNING *',
        [id]
    )
    return result.rows[0]
}

export const updateProductRepo = async (id, name, price) => {
    const result = await pool.query(
        'UPDATE products SET name = $1, price = $2 WHERE id = $3 RETURNING *',
        [name, price, id]
    )
    return result.rows[0]
}

export const getProductsWithCountRepo = async (limit, offset) => {
    const itemsResult = await pool.query(
        'SELECT * FROM products LIMIT $1 OFFSET $2',
        [limit, offset]
    )

    const countResult = await pool.query(
        'SELECT COUNT(*) FROM products'
    )

    return {
        items: itemsResult.rows,
        totalCount: Number(countResult.rows[0].count)
    }
}

export const searchProductsRepo = async (name) => {
    const normalizedName = name.trim().toLowerCase()

    const result = await pool.query(
        'SELECT * FROM products WHERE LOWER(name) LIKE $1',
        ['%' + normalizedName + '%']
    )
    return result.rows
}

export const addProductRepo = async (name, price, userId) => {
    
    const result = await pool.query(
        'INSERT INTO products (name, price, user_id) VALUES ($1, $2, $3) RETURNING *',
        [name, price, userId]
    )
    return result.rows[0]
}

export const createProductWithTransactionRepo = async (name, price, userId) => {
    const client = await pool.connect()

    try {
        await client.query('BEGIN')

        const insertResult = await client.query(
            'INSERT INTO products (name, price) VALUES ($1, $2) RETURNING *',
            [name, price]
        )
        const product = insertResult.rows[0]

        const updatedResult = await client.query(
            'UPDATE products SET price = $1 WHERE id = $2 RETURNING *',
            [price * 1.2, product.id]
        )

        await client.query('COMMIT')
        return updatedResult.rows[0]
    }
    catch (error) {
        await client.query('ROLLBACK')
        throw error
    }
    finally {
        client.release()
    }
}

export const getProductsCountRepo = async () => {
    const result = await pool.query(
        'SELECT COUNT(*) FROM products'
    )
    return Number(result.rows[0].count)
}