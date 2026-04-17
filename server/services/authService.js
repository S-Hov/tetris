import { badRequest } from "../helpers/error.helper.js"
import { checkEmailRepo, registerUserRepo } from "../repositories/authRepository.js"
import bcrypt from "bcryptjs"

export const registerUserService = async (username, email, password, confirmPassword) => {
    const validation = registerSchema.safeParse({ username, email, password, confirmPassword })

    if (!validation.success) {
        const errorMsg = validation.error.errors[0].message
        throw badRequest(errorMsg)
    }

    if (checkEmailRepo(email)) throw badRequest("Пользователь с таким email уже существует")

    if (password !== confirmPassword) throw badRequest("Пароли не совпадают")

    const hashedPassword = await bcrypt.hash(password, 10)

    return await registerUserRepo(email, hashedPassword)
}
