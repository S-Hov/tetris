const listen = (httpServer, port) => new Promise((resolve, reject) => {
    const onError = (error) => {
        httpServer.off('listening', onListening)
        reject(error)
    }
    const onListening = () => {
        httpServer.off('error', onError)
        resolve(httpServer.address())
    }

    httpServer.once('error', onError)
    httpServer.once('listening', onListening)
    httpServer.listen(port)
})

const closeSocketServer = (io) => new Promise((resolve) => {
    if (!io) {
        resolve()
        return
    }

    io.close(() => resolve())
})

const closeHttpServer = (httpServer, timeoutMs) => new Promise((resolve, reject) => {
    if (!httpServer?.listening) {
        resolve()
        return
    }

    let settled = false
    const finish = (error = null) => {
        if (settled) {
            return
        }

        settled = true
        clearTimeout(timeout)

        if (error) {
            reject(error)
            return
        }

        resolve()
    }
    const timeout = setTimeout(() => {
        httpServer.closeAllConnections?.()
        finish()
    }, timeoutMs)
    timeout.unref?.()

    httpServer.close((error) => {
        finish(error)
    })
})

export const createLifecycle = ({
    httpServer,
    io,
    config,
    logger = console,
    syncUploads = async () => ({ synced: 0, total: 0 }),
    closeDatabase = async () => {},
    startupTasks = [],
    shutdownTimeoutMs = 10_000,
}) => {
    let state = 'created'
    let startPromise = null
    let stopPromise = null
    let uploadSyncPromise = Promise.resolve()

    const runUploadSync = async () => {
        try {
            const { synced, total } = await syncUploads(config.uploadsPath)

            if (total > 0) {
                logger.log(`Synced uploaded assets to database: ${synced}/${total}`)
            }
        } catch (error) {
            logger.error('Uploaded assets database sync failed:', error)
        }
    }

    const runStartupTasks = async () => {
        await Promise.all(startupTasks.map(async ({ name, run }) => {
            try {
                await run()
            } catch (error) {
                logger.error(`${name} error`, error)
            }
        }))
    }

    const start = async () => {
        if (state === 'running') {
            return httpServer.address()
        }

        if (startPromise) {
            return startPromise
        }

        if (state !== 'created') {
            throw new Error(`Cannot start server from lifecycle state: ${state}`)
        }

        state = 'starting'
        logger.log(`App: ${config.appName}`)
        startPromise = listen(httpServer, config.port)
            .then((address) => {
                state = 'running'
                const listeningPort = typeof address === 'object' && address
                    ? address.port
                    : config.port
                logger.log(`Server is running on port ${listeningPort}`)
                uploadSyncPromise = Promise.all([
                    runUploadSync(),
                    runStartupTasks(),
                ])
                return address
            })
            .catch((error) => {
                state = 'failed'
                throw error
            })

        return startPromise
    }

    const stop = async ({ reason = 'manual' } = {}) => {
        if (stopPromise) {
            return stopPromise
        }

        if (state === 'stopped') {
            return
        }

        const wasStarting = state === 'starting'
        state = 'stopping'
        logger.log(`Stopping server: ${reason}`)
        stopPromise = (async () => {
            const errors = []

            if (wasStarting && startPromise) {
                try {
                    await startPromise
                } catch {
                    // Startup failure is reported by start(); shutdown still releases resources.
                }
            }

            for (const close of [
                () => uploadSyncPromise,
                () => closeSocketServer(io),
                () => closeHttpServer(httpServer, shutdownTimeoutMs),
                () => closeDatabase(),
            ]) {
                try {
                    await close()
                } catch (error) {
                    errors.push(error)
                    logger.error('Server shutdown step failed:', error)
                }
            }

            state = errors.length > 0 ? 'failed' : 'stopped'

            if (errors.length > 0) {
                throw new AggregateError(errors, 'Server shutdown failed')
            }
        })()

        return stopPromise
    }

    return {
        start,
        stop,
        getState: () => state,
    }
}

export const installProcessSignalHandlers = (runtime, {
    processRef = process,
    logger = console,
} = {}) => {
    let handlingSignal = false

    const handleSignal = (signal) => {
        if (handlingSignal) {
            logger.error(`Received ${signal} while shutdown is already in progress.`)
            processRef.exitCode = 1
            return
        }

        handlingSignal = true
        void runtime.stop({ reason: signal })
            .then(() => {
                processRef.exitCode = 0
            })
            .catch((error) => {
                logger.error('Graceful shutdown failed:', error)
                processRef.exitCode = 1
            })
    }

    const handleSigint = () => handleSignal('SIGINT')
    const handleSigterm = () => handleSignal('SIGTERM')

    processRef.once('SIGINT', handleSigint)
    processRef.once('SIGTERM', handleSigterm)

    return () => {
        processRef.off('SIGINT', handleSigint)
        processRef.off('SIGTERM', handleSigterm)
    }
}
