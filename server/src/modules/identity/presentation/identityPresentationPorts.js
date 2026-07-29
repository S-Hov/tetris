const ports = new Map()

export const configureIdentityPresentationPorts = (implementations) => {
    for (const [name, implementation] of Object.entries(implementations)) {
        if (implementation !== undefined && implementation !== null) {
            ports.set(name, implementation)
        }
    }
}

const get = (name) => {
    if (!ports.has(name)) {
        throw new Error(`Identity presentation port has not been configured: ${name}`)
    }
    return ports.get(name)
}

export const identityPresentationPorts = Object.freeze({
    authenticateOAuth: (...args) => get('passport').authenticate(...args),
    publishActivity: (...args) => get('publishActivity')(...args),
    sendRegistrationVerificationEmail: (...args) => get('sendRegistrationVerificationEmail')(...args),
    sendTemporaryPasswordEmail: (...args) => get('sendTemporaryPasswordEmail')(...args),
    sendVerificationEmail: (...args) => get('sendVerificationEmail')(...args),
    verifyTurnstile: (...args) => get('verifyTurnstile')(...args),
})
