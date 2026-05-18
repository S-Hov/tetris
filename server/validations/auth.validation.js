import { z } from 'zod'

export const registerSchema = z.object({
    username: z.string()
        .min(3, "Никнейм должен быть от 3 символов")
        .max(16, "Никнейм должен быть до 16 символов")
        .regex(/^[a-zA-Z0-9_]+$/, "Только латынь, цифры и подчеркивание"),
    
    email: z.string()
        .email("Неверный формат email"),
    
    password: z.string()
        .min(8, "Пароль минимум 8 символов")
        .max(16, "Пароль максимум 16 символов")
        .regex(/[A-Z]/, "Нужна заглавная буква")
        .regex(/[a-z]/, "Нужна строчная буква")
        .regex(/[0-9]/, "Нужна цифра"),
    
    confirmPassword: z.string(),
    turnstileToken: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
})

export const setPasswordSchema = z.object({
    newPassword: z.string()
        .min(8, "Пароль минимум 8 символов")
        .max(16, "Пароль максимум 16 символов")
        .regex(/[A-Z]/, "Нужна заглавная буква")
        .regex(/[a-z]/, "Нужна строчная буква")
        .regex(/[0-9]/, "Нужна цифра"),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
})

export const loginSchema = z.object({
    email: z.string()
        .email("Неверный формат email"),

    password: z.string()
        .min(1, "Введите пароль"),
}).passthrough()

export const verifyEmailSchema = z.object({
    code: z.string()
        .trim()
        .regex(/^\d+$/, "Код должен состоять только из цифр"),
})

export const resendVerificationEmailSchema = z.object({
    email: z.string()
        .email("Неверный формат email"),
})

export const changeUnverifiedEmailSchema = z.object({
    currentEmail: z.string()
        .email("Неверный формат текущей почты"),
    email: z.string()
        .email("Неверный формат новой почты"),
})

export const requestAccountEmailChangeSchema = z.object({
    email: z.string()
        .email("Неверный формат новой почты"),
})

export const requestPasswordResetSchema = z.object({
    email: z.string()
        .email("Неверный формат email"),
})

export const updatePasswordSchema = z.object({
    currentPassword: z.string()
        .min(1, "Введите текущий пароль"),
    newPassword: z.string()
        .min(8, "Пароль минимум 8 символов")
        .max(16, "Пароль максимум 16 символов")
        .regex(/[A-Z]/, "Нужна заглавная буква")
        .regex(/[a-z]/, "Нужна строчная буква")
        .regex(/[0-9]/, "Нужна цифра"),
    confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
})
