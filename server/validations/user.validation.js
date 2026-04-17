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
    
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Пароли не совпадают",
    path: ["confirmPassword"],
})