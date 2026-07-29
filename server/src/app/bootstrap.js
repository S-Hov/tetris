import { createApp } from './createApp.js'
import { createContainer } from './createContainer.js'
import { createHttpServer } from './createHttpServer.js'
import { createLifecycle } from './lifecycle.js'
import { createSocketServer } from './createSocketServer.js'

export const createServerRuntime = ({
    container = createContainer(),
} = {}) => {
    const app = createApp(container.config, {
        logger: container.logger,
    })
    const httpServer = createHttpServer({ app })
    const io = createSocketServer({
        httpServer,
        allowedOrigins: container.config.allowedOrigins,
    })
    const lifecycle = createLifecycle({
        httpServer,
        io,
        config: container.config,
        logger: container.logger,
        syncUploads: container.services.syncUploads,
        closeDatabase: container.services.closeDatabase,
        startupTasks: container.services.startupTasks,
    })

    return {
        app,
        httpServer,
        io,
        container,
        start: lifecycle.start,
        stop: lifecycle.stop,
        getState: lifecycle.getState,
    }
}
