export {
    REQUIRED_CAPABILITIES,
    createIdentityApplication,
} from './application/createIdentityApplication.js'
export {
    configureIdentityApplication,
    identityApplication,
} from './application/identityApplication.js'
export { configureIdentityPorts } from './application/identityPorts.js'
export { configureIdentityDatabase } from './infrastructure/identityDatabase.js'
export { configureIdentityPresentationPorts } from './presentation/identityPresentationPorts.js'
export {
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    isStrongPassword,
    normalizeIdentityEmail,
} from './domain/passwordPolicy.js'
export {
    checkAuth,
    checkNotAuth,
    createAuthMiddleware,
    optionalAuth,
} from './presentation/http/authMiddleware.js'
export {
    createAuthToken,
    getAuthCookieOptions,
    getTokenLifetimeDays,
    setAuthCookie,
} from './presentation/http/sessionCookies.js'
export {
    createOAuthState,
    getOAuthStateCookieName,
    getOAuthStateCookieOptions,
    verifyOAuthState,
} from './application/oauthState.js'
export {
    OAUTH_PROVIDER_LABELS,
    OAUTH_PROVIDERS,
    createOAuthProviderConfig,
    getOAuthCallbackUrl,
    getServerUrl,
    isOAuthProviderEnabled,
} from './infrastructure/oauth/oauthProviders.js'
export { identityRouter } from './presentation/http/identity.routes.js'
export { oauthCallbackRouter } from './presentation/http/oauthCallback.routes.js'
