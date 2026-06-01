import { getLoginInputs } from "./AuthForm.data"
import AuthInput from "@/shared/ui/Auth/AuthInput"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/shared/hooks/useAuth"
import { authenticationAPI } from "@/shared/api/auth"
import { useCallback, useState } from "react"
import notify from "@/utils/Notifications"
import TurnstileWidget from "@/shared/ui/TurnstileWidget"
import { useTranslation } from "react-i18next"

const LoginForm = () => {
    const { t } = useTranslation()
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
    const loginInputs = getLoginInputs(t)

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
            notify(t('auth.security.turnstile'), 'error')
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
                notify(result.message || t('auth.login.success'))
                navigate('/profile', { replace: true })
                return
            }
            throw new Error(result.message || t('auth.login.error'))
        } catch (error) {
            const responseData = error.data?.data

            if (responseData?.code === 'EMAIL_NOT_VERIFIED' && responseData.redirectTo) {
                navigate(responseData.redirectTo, { replace: true })
                return
            }

            setServerError(error.message || t('auth.login.error'))
            notify(error.message || t('auth.login.error'), 'error')
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

            notify(t('auth.login.resetSuccess'), 'success')
            navigate(response.redirectTo || `/verify-email/${encodeURIComponent(response.email)}?mode=password-reset`, {
                replace: true,
            })
        } catch (error) {
            setServerError(error.message || t('auth.login.resetError'))
            notify(error.message || t('auth.login.resetError'), 'error')
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
                    {isPending ? t('auth.login.submitting') : t('auth.login.submit')}
                </button>

                <div className="options-row">
                    <button
                        type="button"
                        className="forgot-password link auth-link-button"
                        id="forgotPasswordLink"
                        onClick={() => setIsResetModalOpen(true)}
                    >
                        {t('auth.login.forgotPassword')}
                    </button>
                </div>
            </form>

            {isResetModalOpen && (
                <div className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="password-reset-title">
                    <form className="auth-modal__panel" onSubmit={handlePasswordReset}>
                        <h3 id="password-reset-title">{t('auth.login.resetTitle')}</h3>
                        <label>
                            <span>{t('auth.login.resetEmail')}</span>
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
                                {isResetPending ? t('auth.login.resetSubmitting') : t('auth.login.resetSubmit')}
                            </button>
                            <button
                                type="button"
                                className="auth-modal__cancel"
                                disabled={isResetPending}
                                onClick={() => setIsResetModalOpen(false)}
                            >
                                {t('auth.login.cancel')}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </>
    )
}

export default LoginForm
