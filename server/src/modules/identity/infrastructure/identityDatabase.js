let configuredDatabase = null

export const configureIdentityDatabase = (database) => {
    if (!database || typeof database.query !== 'function' || typeof database.connect !== 'function') {
        throw new TypeError('Identity database must implement query() and connect()')
    }

    configuredDatabase = database
}

const getDatabase = () => {
    if (!configuredDatabase) {
        throw new Error('Identity database has not been configured by the composition root')
    }

    return configuredDatabase
}

export const identityDatabase = Object.freeze({
    query: (...args) => getDatabase().query(...args),
    connect: (...args) => getDatabase().connect(...args),
})
