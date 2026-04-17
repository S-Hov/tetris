export const registerInputs = [
    {
        key: 'username', type: 'text', placeholder: 'Игровой никнейм', errorBoxId: 'usernameError',
        icon: 'fas fa-user-astronaut', ariaError: 'username-error', title: 'Игровой никнейм должен быть от 3 до 16 символов',
        validation: {
            required: "Игровой никнейм должен быть от 3 до 16 символов",
            minLength: { value: 3, message: "Слишком короткий логин" },
            maxLength: { value: 16, message: "Слишком длинный логин" },
            pattern: { value: /^[a-zA-Z0-9_]+$/, message: "Логин может содержать только латинские буквы, цифры и символ подчеркивания" }
        }
    },
    {
        key: 'email', type: 'email', placeholder: 'Электронная почта', errorBoxId: 'emailError',
        icon: 'fas fa-envelope', ariaError: 'email-error', title: 'Email должен быть в формате name@example.com',
        validation: {
            required: "Введите электронную почту",
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: "Email должен быть в формате name@example.com" }
        }
    },
    {
        key: 'password', type: 'password', placeholder: 'Пароль', errorBoxId: 'passwordError',
        icon: 'fas fa-lock', ariaError: 'password-error', title: 'Пароль должен быть длиной от 8 до 16 символов',
        validation: {
            required: "Введите пароль",
            minLength: { value: 8, message: "Пароль должен быть не менее 8 символов" },
            maxLength: { value: 16, message: "Пароль должен быть не более 20 символов" },
            pattern: { value: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,16}$/, message: "Пароль должен быть длиной от 8 до 16 символов, включать как минимум одну цифру, одну букву в нижнем и одну в верхнем регистре" }
        }
    },
    {
        key: 'confirmPassword', type: 'password', placeholder: 'Подтвердите пароль', errorBoxId: 'confirmError',
        icon: 'fas fa-key', ariaError: 'confirm-error', title: 'Подтвердите пароль',
        validation: {
            required: "Подтвердите пароль",
        }
    },
]

export const loginInputs = [
    {
        key: 'email', type: 'email', placeholder: 'Электронная почта',
        icon: 'fas fa-envelope',
    },
    {
        key: 'password', type: 'password', placeholder: 'Пароль',
        icon: 'fas fa-lock',
    },
]