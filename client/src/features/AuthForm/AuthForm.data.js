export const registerInputs = [
    {key: 'username', type: 'text', placeholder: 'Игровой никнейм', errorBoxId: 'usernameError', error: 'Игровой никнейм должен быть от 3 до 16 символов', icon: 'fas fa-user-astronaut'},
    {key: 'email', type: 'email', placeholder: 'Электронная почта', errorBoxId: 'emailError', error: 'Неверный формат электронной почты', icon: 'fas fa-envelope'},
    {key: 'password', type: 'password', placeholder: 'Пароль', errorBoxId: 'passwordError', error: 'Пароль должен быть от 6 до 16 символов', icon: 'fas fa-lock'},
    {key: 'confirmPassword', type: 'password', placeholder: 'Подтвердите пароль', errorBoxId: 'confirmError', error: 'Пароли не совпадают', icon: 'fas fa-key'}
]