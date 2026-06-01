export const getRegisterInputs = (t) => [
    {
        key: 'username', type: 'text', placeholder: t('auth.fields.username.placeholder'), errorBoxId: 'usernameError',
        icon: 'fas fa-user-astronaut', ariaError: 'username-error', title: t('auth.fields.username.title'),
        validation: {
            required: t('auth.fields.username.required'),
            minLength: { value: 3, message: t('auth.fields.username.minLength') },
            maxLength: { value: 16, message: t('auth.fields.username.maxLength') },
            pattern: { value: /^[a-zA-Z0-9_]+$/, message: t('auth.fields.username.pattern') }
        }
    },
    {
        key: 'email', type: 'email', placeholder: t('auth.fields.email.placeholder'), errorBoxId: 'emailError',
        icon: 'fas fa-envelope', ariaError: 'email-error', title: t('auth.fields.email.title'),
        validation: {
            required: t('auth.fields.email.required'),
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t('auth.fields.email.pattern') }
        }
    },
    {
        key: 'password', type: 'password', placeholder: t('auth.fields.password.placeholder'), errorBoxId: 'passwordError',
        icon: 'fas fa-lock', ariaError: 'password-error', title: t('auth.fields.password.title'),
        validation: {
            required: t('auth.fields.password.required'),
            minLength: { value: 8, message: t('auth.fields.password.minLength') },
            maxLength: { value: 16, message: t('auth.fields.password.maxLength') },
            pattern: { value: /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,16}$/, message: t('auth.fields.password.pattern') }
        }
    },
    {
        key: 'confirmPassword', type: 'password', placeholder: t('auth.fields.confirmPassword.placeholder'), errorBoxId: 'confirmError',
        icon: 'fas fa-key', ariaError: 'confirm-error', title: t('auth.fields.confirmPassword.title'),
        validation: {
            required: t('auth.fields.confirmPassword.required'),
        }
    },
]

export const getLoginInputs = (t) => [
    {
        key: 'email', type: 'email', placeholder: t('auth.fields.email.placeholder'),
        icon: 'fas fa-envelope',
        ariaError: 'login-email-error',
        validation: {
            required: t('auth.fields.email.required'),
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: t('auth.fields.email.pattern') }
        }
    },
    {
        key: 'password', type: 'password', placeholder: t('auth.fields.password.placeholder'),
        icon: 'fas fa-lock',
        ariaError: 'login-password-error',
        validation: {
            required: t('auth.fields.password.required'),
        }
    },
]
