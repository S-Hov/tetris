import { createIdentityApplication } from './createIdentityApplication.js'

let configuredApplication = null

const getApplication = () => {
    if (!configuredApplication) {
        throw new Error('Identity application has not been configured by the composition root')
    }

    return configuredApplication
}

export const configureIdentityApplication = (dependencies) => {
    if (configuredApplication) {
        return configuredApplication
    }

    configuredApplication = createIdentityApplication(dependencies)
    return configuredApplication
}

export const identityApplication = Object.freeze({
    registerUser: (...args) => getApplication().registerUser(...args),
    findPasswordLoginUser: (...args) => getApplication().findPasswordLoginUser(...args),
    confirmLogin: (...args) => getApplication().confirmLogin(...args),
    getSessionUser: (...args) => getApplication().getSessionUser(...args),
    getSocketUser: (...args) => getApplication().getSocketUser(...args),
    updateProfile: (...args) => getApplication().updateProfile(...args),
    updateAvatar: (...args) => getApplication().updateAvatar(...args),
    requestAccountEmailChange: (...args) => getApplication().requestAccountEmailChange(...args),
    changeUnverifiedEmail: (...args) => getApplication().changeUnverifiedEmail(...args),
    getVerificationMeta: (...args) => getApplication().getVerificationMeta(...args),
    verifyEmail: (...args) => getApplication().verifyEmail(...args),
    requestPasswordReset: (...args) => getApplication().requestPasswordReset(...args),
    getPasswordResetMeta: (...args) => getApplication().getPasswordResetMeta(...args),
    completePasswordReset: (...args) => getApplication().completePasswordReset(...args),
    updatePassword: (...args) => getApplication().updatePassword(...args),
    resendVerificationCode: (...args) => getApplication().resendVerificationCode(...args),
    ensurePendingVerification: (...args) => getApplication().ensurePendingVerification(...args),
    createAuthLog: (...args) => getApplication().createAuthLog(...args),
    getLoginHistory: (...args) => getApplication().getLoginHistory(...args),
    handleOAuthLogin: (...args) => getApplication().handleOAuthLogin(...args),
    getConnections: (...args) => getApplication().getConnections(...args),
    unlinkConnection: (...args) => getApplication().unlinkConnection(...args),
    setInitialPassword: (...args) => getApplication().setInitialPassword(...args),
})
