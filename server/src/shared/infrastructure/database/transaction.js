export const withTransaction = async (pool, operation) => {
    if (!pool || typeof pool.connect !== 'function') {
        throw new TypeError('withTransaction requires a PostgreSQL pool')
    }

    if (typeof operation !== 'function') {
        throw new TypeError('withTransaction requires an operation callback')
    }

    const client = await pool.connect()

    try {
        await client.query('BEGIN')
        const result = await operation(client)
        await client.query('COMMIT')
        return result
    } catch (error) {
        try {
            await client.query('ROLLBACK')
        } catch (rollbackError) {
            throw new AggregateError(
                [error, rollbackError],
                'Database transaction and rollback failed',
                { cause: error },
            )
        }

        throw error
    } finally {
        client.release()
    }
}
