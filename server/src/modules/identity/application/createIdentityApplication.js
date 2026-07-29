const REQUIRED_CAPABILITIES = Object.freeze([
    'registerUser',
    'findPasswordLoginUser',
    'confirmLogin',
    'getSessionUser',
    'getSocketUser',
    'updateProfile',
    'updateAvatar',
    'requestAccountEmailChange',
    'changeUnverifiedEmail',
    'getVerificationMeta',
    'verifyEmail',
    'requestPasswordReset',
    'getPasswordResetMeta',
    'completePasswordReset',
    'updatePassword',
    'resendVerificationCode',
    'ensurePendingVerification',
    'createAuthLog',
    'getLoginHistory',
    'handleOAuthLogin',
    'getConnections',
    'unlinkConnection',
    'setInitialPassword',
])

const requireCapability = (dependencies, name) => {
    const capability = dependencies[name]

    if (typeof capability !== 'function') {
        throw new TypeError(`Identity capability is required: ${name}`)
    }

    return capability
}

export const createIdentityApplication = (dependencies) => {
    const application = Object.fromEntries(REQUIRED_CAPABILITIES.map((name) => [
        name,
        (...args) => requireCapability(dependencies, name)(...args),
    ]))

    return Object.freeze(application)
}

export { REQUIRED_CAPABILITIES }
