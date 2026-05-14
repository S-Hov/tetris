import bcrypt from 'bcrypt'
import { badRequest, forbidden, notFound } from '../helpers/error.helper.js'
import { OAUTH_PROVIDER_LABELS, OAUTH_PROVIDERS, isSupportedOAuthProvider } from '../config/oauthProviders.js'
import { getRoleByKeyRepo } from '../repositories/helper.js'
import {
    countUserAccountsRepo,
    deleteUserAccountRepo,
    findOrCreateOAuthUserRepo,
    getUserConnectionsRepo,
    getUserForOAuthByIdRepo,
    linkOAuthAccountRepo,
} from '../repositories/oauthRepository.js'
import {
    getUserService,
} from './authService.js'
import { updateUserPasswordRepo } from '../repositories/authRepository.js'

const PASSWORD_RULE_MESSAGE = 'Пароль должен быть 8-16 символов, с заглавной, строчной буквой и цифрой'

const normalizeEmail = (email) => {
    const normalizedEmail = String(email || '').trim().toLowerCase()

    return normalizedEmail.includes('@') ? normalizedEmail : null
}

const normalizeUsername = ({ value, provider, providerAccountId }) => {
    const username = String(value || '')
        .trim()
        .replace(/\s+/g, ' ')

    if (
        username.length >= 2 &&
        username.length <= 32 &&
        /^[\p{L}\p{N}_ .-]+$/u.test(username)
    ) {
        return username
    }

    return `${OAUTH_PROVIDER_LABELS[provider] || provider}_${String(providerAccountId).slice(-8)}`
}

const shouldStoreOAuthTokens = () => process.env.OAUTH_STORE_TOKENS === 'true'

const getStoredTokens = (oauthProfile) => {
    if (!shouldStoreOAuthTokens()) {
        return {
            accessToken: null,
            refreshToken: null,
        }
    }

    return {
        accessToken: oauthProfile.accessToken || null,
        refreshToken: oauthProfile.refreshToken || null,
    }
}

const isStrongPassword = (password) => (
    typeof password === 'string' &&
    password.length >= 8 &&
    password.length <= 16 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
)

const normalizeOAuthProfile = (provider, oauthProfile) => {
    const providerAccountId = String(oauthProfile?.providerAccountId || '').trim()

    if (!isSupportedOAuthProvider(provider) || oauthProfile?.provider !== provider) {
        throw badRequest('Неподдерживаемый OAuth провайдер')
    }

    if (!providerAccountId) {
        throw badRequest('OAuth провайдер не вернул идентификатор аккаунта')
    }

    return {
        ...oauthProfile,
        provider,
        providerAccountId,
        email: normalizeEmail(oauthProfile.email),
        emailVerified: Boolean(oauthProfile.emailVerified),
        nickname: normalizeUsername({
            value: oauthProfile.nickname,
            provider,
            providerAccountId,
        }),
        avatar: oauthProfile.avatar || null,
    }
}

export const findOrCreateOAuthUserService = async ({ provider, oauthProfile }) => {
    const normalizedProfile = normalizeOAuthProfile(provider, oauthProfile)
    const role = await getRoleByKeyRepo('user')

    if (!role) {
        throw badRequest('Роль user не найдена')
    }

    const tokens = getStoredTokens(normalizedProfile)

    return await findOrCreateOAuthUserRepo({
        provider,
        providerAccountId: normalizedProfile.providerAccountId,
        email: normalizedProfile.email,
        emailVerified: normalizedProfile.emailVerified,
        username: normalizedProfile.nickname,
        avatarUrl: normalizedProfile.avatar,
        roleId: role.id,
        ...tokens,
    })
}

export const linkOAuthAccountService = async ({ userId, provider, oauthProfile }) => {
    const normalizedProfile = normalizeOAuthProfile(provider, oauthProfile)
    const user = await getUserForOAuthByIdRepo(userId)

    if (!user) {
        throw notFound('Пользователь не найден')
    }

    const tokens = getStoredTokens(normalizedProfile)
    const result = await linkOAuthAccountRepo({
        userId,
        provider,
        providerAccountId: normalizedProfile.providerAccountId,
        ...tokens,
    })

    if (result.status === 'belongs_to_other_user') {
        throw forbidden('Этот внешний аккаунт уже привязан к другому пользователю')
    }

    return {
        user,
        account: result.account,
        status: result.status,
    }
}

export const handleOAuthLoginService = async ({ provider, oauthProfile, mode = 'login', userId = null }) => {
    if (mode === 'link') {
        return await linkOAuthAccountService({
            userId,
            provider,
            oauthProfile,
        })
    }

    return await findOrCreateOAuthUserService({
        provider,
        oauthProfile,
    })
}

export const getConnectionsService = async (userId) => {
    const rows = await getUserConnectionsRepo(userId)
    const firstRow = rows[0]

    if (!firstRow) {
        throw notFound('Пользователь не найден')
    }

    const hasPassword = Boolean(firstRow.password_hash)
    const connectedProviders = rows
        .filter((row) => row.account_id)
        .map((row) => ({
            provider: row.provider,
            label: OAUTH_PROVIDER_LABELS[row.provider] || row.provider,
            connectedAt: row.created_at,
        }))
    const loginMethodCount = connectedProviders.length + (hasPassword ? 1 : 0)

    return {
        hasPassword,
        providers: OAUTH_PROVIDERS.map((provider) => {
            const connectedProvider = connectedProviders.find((item) => item.provider === provider)

            return {
                provider,
                label: OAUTH_PROVIDER_LABELS[provider],
                isConnected: Boolean(connectedProvider),
                connectedAt: connectedProvider?.connectedAt || null,
                canUnlink: Boolean(connectedProvider) && loginMethodCount > 1,
            }
        }),
    }
}

export const unlinkConnectionService = async ({ userId, provider }) => {
    if (!isSupportedOAuthProvider(provider)) {
        throw badRequest('Неподдерживаемый OAuth провайдер')
    }

    const user = await getUserForOAuthByIdRepo(userId)

    if (!user) {
        throw notFound('Пользователь не найден')
    }

    const accountCount = await countUserAccountsRepo(userId)
    const hasPassword = Boolean(user.password_hash)

    if (accountCount <= 1 && !hasPassword) {
        throw badRequest('Нельзя удалить последний способ входа. Сначала установите пароль или привяжите другой провайдер')
    }

    const deletedAccount = await deleteUserAccountRepo({
        userId,
        provider,
    })

    if (!deletedAccount) {
        throw notFound('Подключение не найдено')
    }

    return await getConnectionsService(userId)
}

export const setInitialPasswordService = async ({ userId, nextPassword }) => {
    const user = await getUserForOAuthByIdRepo(userId)

    if (!user) {
        throw notFound('Пользователь не найден')
    }

    if (user.password_hash) {
        throw badRequest('Пароль уже установлен. Используйте смену пароля')
    }

    if (!isStrongPassword(nextPassword)) {
        throw badRequest(PASSWORD_RULE_MESSAGE)
    }

    const passwordHash = await bcrypt.hash(nextPassword, 10)

    await updateUserPasswordRepo({
        userId,
        passwordHash,
    })

    return await getUserService(userId)
}
