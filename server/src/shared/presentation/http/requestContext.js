import { AsyncLocalStorage } from 'node:async_hooks'
import { randomUUID } from 'node:crypto'

const requestStorage = new AsyncLocalStorage()
const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/

const resolveRequestId = (req) => {
    const supplied = req.get?.('x-request-id') || req.headers?.['x-request-id']

    return REQUEST_ID_PATTERN.test(String(supplied || ''))
        ? String(supplied)
        : randomUUID()
}

export const requestContext = (req, res, next) => {
    const context = {
        requestId: resolveRequestId(req),
        method: req.method,
        path: req.originalUrl || req.url,
        startedAt: Date.now(),
    }

    res.setHeader?.('x-request-id', context.requestId)
    requestStorage.run(context, next)
}

export const getRequestContext = () => requestStorage.getStore() || null

export const updateRequestContext = (values) => {
    const context = requestStorage.getStore()

    if (context && values && typeof values === 'object') {
        Object.assign(context, values)
    }

    return context || null
}

export const runWithRequestContext = (context, callback) => (
    requestStorage.run({ ...context }, callback)
)
