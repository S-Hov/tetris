export const createRequestLogger = ({
    logger,
    clock = () => Date.now(),
} = {}) => (req, res, next) => {
    const startedAt = clock()

    res.once('finish', () => {
        const write = logger.info || logger.log

        write.call(logger, 'request_completed', {
            method: req.method,
            path: req.originalUrl || req.url,
            statusCode: res.statusCode,
            durationMs: clock() - startedAt,
        })
    })

    next()
}
