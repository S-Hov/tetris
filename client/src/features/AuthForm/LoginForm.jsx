import { loginInputs } from "./AuthForm.data"
import AuthInput from "@/shared/ui/Auth/AuthInput"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/shared/hooks/useAuth"
import { authenticationAPI } from "@/shared/api/auth"
import { useCallback, useState } from "react"
import notify from "@/utils/Notifications"
import TurnstileWidget from "@/shared/ui/TurnstileWidget"

const LoginForm = () => {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [serverError, setServerError] = useState(null)
    const [isPending, setIsPending] = useState(false)
    const [isResetModalOpen, setIsResetModalOpen] = useState(false)
    const [resetEmail, setResetEmail] = useState('')
    const [isResetPending, setIsResetPending] = useState(false)
    const [requiresTurnstile, setRequiresTurnstile] = useState(false)
    const [turnstileToken, setTurnstileToken] = useState('')
    const [turnstileResetSignal, setTurnstileResetSignal] = useState(0)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        mode: "onChange",
    })

    const handleTurnstileTokenChange = useCallback((token) => {
        setTurnstileToken(token)
    }, [])

    const resetTurnstile = () => {
        setTurnstileToken('')
        setTurnstileResetSignal((value) => value + 1)
    }

    const onSubmit = async (data) => {
        if (requiresTurnstile && !turnstileToken) {
            notify('Проверка безопасности не пройдена', 'error')
            return
        }

        setIsPending(true)
        setServerError(null)

        try {
            const result = await login({
                ...data,
                ...(requiresTurnstile ? { turnstileToken } : {}),
            })
            if (result.success) {
                notify(result.message || 'Вы успешно вошли')
                navigate('/profile', { replace: true })
                return
            }
            throw new Error(result.message || 'Не удалось войти')
        } catch (error) {
            const responseData = error.data?.data

            if (responseData?.code === 'EMAIL_NOT_VERIFIED' && responseData.redirectTo) {
                navigate(responseData.redirectTo, { replace: true })
                return
            }

            setServerError(error.message || 'Не удалось войти')
            notify(error.message || 'Не удалось войти', 'error')
            setRequiresTurnstile((current) => current || responseData?.requiresTurnstile === true)
            resetTurnstile()
        } finally {
            setIsPending(false)
        }
    }

    const handlePasswordReset = async (event) => {
        event.preventDefault()
        setIsResetPending(true)
        setServerError(null)

        try {
            const response = await authenticationAPI.requestPasswordReset({ email: resetEmail })

            notify('Код восстановления отправлен', 'success')
            navigate(response.redirectTo || `/verify-email/${encodeURIComponent(response.email)}?mode=password-reset`, {
                replace: true,
            })
        } catch (error) {
            setServerError(error.message || 'Не удалось отправить код восстановления')
            notify(error.message || 'Не удалось отправить код восстановления', 'error')
        } finally {
            setIsResetPending(false)
        }
    }

    return (
        <>
            <form id="loginForm" noValidate onSubmit={handleSubmit(onSubmit)}>
                {loginInputs.map((input) => {
                    return (
                        <AuthInput
                            key={input.key}
                            input={input}
                            register={() => register(input.key, input.validation)}
                            error={errors[input.key]}
                        />
                    )
                })}

                {serverError && <div className="error-msg">{serverError}</div>}

                {requiresTurnstile && (
                    <TurnstileWidget onTokenChange={handleTurnstileTokenChange} resetSignal={turnstileResetSignal} />
                )}

                <button type="submit" className="login-btn submit-btn" disabled={isPending || (requiresTurnstile && !turnstileToken)}>
                    {isPending ? 'ВХОДИМ...' : 'ВОЙТИ'}
                </button>

                <div className="options-row">
                    <button
                        type="button"
                        className="forgot-password link auth-link-button"
                        id="forgotPasswordLink"
                        onClick={() => setIsResetModalOpen(true)}
                    >
                        Забыли пароль?
                    </button>
                </div>
            </form>

            {isResetModalOpen && (
                <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="password-reset-title">
                    <form className="auth-modal__panel" onSubmit={handlePasswordReset}>
                        <h3 id="password-reset-title">Восстановление пароля</h3>
                        <label>
                            <span>Email аккаунта</span>
                            <input
                                type="email"
                                value={resetEmail}
                                onChange={(event) => setResetEmail(event.target.value)}
                                required
                                autoFocus
                            />
                        </label>
                        <div className="auth-modal__actions">
                            <button type="submit" className="submit-btn" disabled={isResetPending}>
                                {isResetPending ? 'Отправляем...' : 'Получить код'}
                            </button>
                            <button
                                type="button"
                                className="auth-modal__cancel"
                                disabled={isResetPending}
                                onClick={() => setIsResetModalOpen(false)}
                            >
                                Отмена
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    )
}

export default LoginForm
