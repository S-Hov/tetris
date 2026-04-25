import { loginInputs } from "./AuthForm.data"
import AuthInput from "@/shared/ui/Auth/AuthInput"
import { useForm } from "react-hook-form"
import { useNavigate } from "react-router-dom"
import { useAuth } from "@/shared/hooks/useAuth"
import { useState } from "react"
import notify from "@/utils/Notifications"

const LoginForm = () => {
    const navigate = useNavigate()
    const { login } = useAuth()
    const [serverError, setServerError] = useState(null)
    const [isPending, setIsPending] = useState(false)

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({
        mode: "onChange",
    })

    const onSubmit = async (data) => {
        setIsPending(true)
        setServerError(null)

        try {
            const result = await login(data)
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
        } finally {
            setIsPending(false)
        }
    }

    return (
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

            <button type="submit" className="login-btn submit-btn" disabled={isPending}>
                {isPending ? 'ВХОДИМ...' : 'ВОЙТИ'}
            </button>

            <div className="options-row">
                <a href="#" className="forgot-password link" id="forgotPasswordLink">Забыли пароль?</a>
            </div>
        </form>
    )
}

export default LoginForm
