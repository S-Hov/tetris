import bcrypt from 'bcrypt'
import crypto from 'crypto'
import { badRequest } from '../helpers/error.helper.js'
import {
    checkEmailRepo,
    registerUserWithVerificationRepo,
} from '../repositories/authRepository.js'
import { getRoleByKeyRepo } from '../repositories/helper.js'

export const registerUserService = async (username, email, password) => {
    if (await checkEmailRepo(email)) {
        throw badRequest('Пользователь с таким email уже существует')
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const role = await getRoleByKeyRepo('user')
    if (!role) {
        throw badRequest('Роль user не найдена')
    }

    const verificationCode = String(crypto.randomInt(100000, 1000000))

    const verificationCodeHash = crypto
        .createHash('sha256')
        .update(verificationCode)
        .digest('hex')

    const ttlSeconds = Number(process.env.EMAIL_VERIFICATION_TTL_SECONDS || 180)
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000)

    const user = await registerUserWithVerificationRepo({
        username,
        email,
        passwordHash: hashedPassword,
        roleId: role.id,
        verificationCodeHash,
        expiresAt,
    })

    return {
        user,
        verificationCode,
    }
}

export const loginUserService = async (email) => {
    return await loginUserRepo(email)
}

export const getUserService = async (id) => {
    return await getUserRepo(id)
}
