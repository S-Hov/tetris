const configuredPorts = new Map()

export const configureIdentityPorts = (ports) => {
    for (const [name, implementation] of Object.entries(ports)) {
        if (typeof implementation === 'function') {
            configuredPorts.set(name, implementation)
        }
    }
}

const call = (name, args) => {
    const port = configuredPorts.get(name)

    if (!port) {
        throw new Error(`Identity port has not been configured: ${name}`)
    }

    return port(...args)
}

export const checkEmailRepo = (...args) => call('checkEmailRepo', args)
export const changePendingUserEmailRepo = (...args) => call('changePendingUserEmailRepo', args)
export const createAuthLogRepo = (...args) => call('createAuthLogRepo', args)
export const createEmailVerificationRepo = (...args) => call('createEmailVerificationRepo', args)
export const expireEmailVerificationRepo = (...args) => call('expireEmailVerificationRepo', args)
export const getRecentUserMatchesRepo = (...args) => call('getRecentUserMatchesRepo', args)
export const getRecentLoginHistoryRepo = (...args) => call('getRecentLoginHistoryRepo', args)
export const getLatestPendingVerificationByEmailRepo = (...args) => call('getLatestPendingVerificationByEmailRepo', args)
export const getUserMatchStatsRepo = (...args) => call('getUserMatchStatsRepo', args)
export const getUserRankStatsRepo = (...args) => call('getUserRankStatsRepo', args)
export const getUserByEmailRepo = (...args) => call('getUserByEmailRepo', args)
export const getUserAuthByIdRepo = (...args) => call('getUserAuthByIdRepo', args)
export const getUserRepo = (...args) => call('getUserRepo', args)
export const getSocketUserRepo = (...args) => call('getSocketUserRepo', args)
export const loginUserRepo = (...args) => call('loginUserRepo', args)
export const markEmailVerifiedRepo = (...args) => call('markEmailVerifiedRepo', args)
export const updateUserPasswordRepo = (...args) => call('updateUserPasswordRepo', args)
export const registerUserWithVerificationRepo = (...args) => call('registerUserWithVerificationRepo', args)
export const updateUserAvatarRepo = (...args) => call('updateUserAvatarRepo', args)
export const updateUserLastLoginRepo = (...args) => call('updateUserLastLoginRepo', args)
export const updateUserProfileRepo = (...args) => call('updateUserProfileRepo', args)
export const requestUserEmailChangeRepo = (...args) => call('requestUserEmailChangeRepo', args)
export const getRoleByKeyRepo = (...args) => call('getRoleByKeyRepo', args)
export const getRankTier = (...args) => call('getRankTier', args)
export const storeUploadedAssetRepo = (...args) => call('storeUploadedAssetRepo', args)
export const countUserAccountsRepo = (...args) => call('countUserAccountsRepo', args)
export const deleteUserAccountRepo = (...args) => call('deleteUserAccountRepo', args)
export const findOrCreateOAuthUserRepo = (...args) => call('findOrCreateOAuthUserRepo', args)
export const getUserConnectionsRepo = (...args) => call('getUserConnectionsRepo', args)
export const getUserForOAuthByIdRepo = (...args) => call('getUserForOAuthByIdRepo', args)
export const linkOAuthAccountRepo = (...args) => call('linkOAuthAccountRepo', args)
