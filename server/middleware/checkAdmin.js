import { pool } from '../db/index.js'
import { forbidden, unauthorized } from '../helpers/error.helper.js'
import { asyncHandler } from '../utils/asyncHandler.js'

export const checkAdmin = asyncHandler(async (req, res, next) => {
    if (!req.user?.roleId) {
        return next(unauthorized('Admin authentication required'))
    }

    const { rows } = await pool.query(
        'SELECT key FROM roles WHERE id = $1 LIMIT 1',
        [req.user.roleId]
    )

    if (rows[0]?.key !== 'admin') {
        return next(forbidden('Admin access required'))
    }

    next()
})
