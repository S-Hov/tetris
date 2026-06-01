import { useForm, useWatch } from "react-hook-form"
import { useCallback, useState } from "react"
import AuthInput from "@/shared/ui/Auth/AuthInput"
import { getRegisterInputs } from "./AuthForm.data"
import { useRegister } from "@/shared/hooks/useAuth"
import { useNavigate } from "react-router-dom"
import notify from "@/utils/Notifications"
import TurnstileWidget from "@/shared/ui/TurnstileWidget"
import { useTranslation } from "react-i18next"

const RegisterForm = () => {
    const { t } = useTranslation()
    const navigate = useNavigate()
    const {
        register,
        handleSubmit,
        control,
        formState: { errors }
    } = useForm({
        mode: "onChange"
    })

    const { mutate, isPending, error: serverError } = useRegister()
    const [turnstileToken, setTurnstileToken] = useState('')
    const [turnstileResetSignal, setTurnstileResetSignal] = useState(0)
    const registerInputs = getRegisterInputs(t)

    const handleTurnstileTokenChange = useCallback((token) => {
        setTurnstileToken(token)
    }, [])

    const resetTurnstile = () => {
        setTurnstileToken('')
        setTurnstileResetSignal((value) => value + 1)
    }

    const onSubmit = async (data) => {
        if (!turnstileToken) {
            notify(t('auth.security.turnstile'), 'error')
            return
        }

        try {
            const response = await mutate({ ...data, turnstileToken })
            if(!response.success) {
                notify(response.message, "error")
                resetTurnstile()
                return
            }
            
            const redirectTo = response.redirectTo || `/verify-email/${encodeURIComponent(data.email)}`

            notify(response.message)

            navigate(redirectTo)
        } catch (error) {
            resetTurnstile()
            notify(error.message || t('auth.security.turnstile'), 'error')
        }
    };
    
    const password = useWatch({ control, name: "password" })

    return (
        <form id="registerForm" noValidate onSubmit={handleSubmit(onSubmit)}>
            {registerInputs.map((input) => {
                let validationRules = { ...input.validation }

                if (input.key === "confirmPassword") {
                    validationRules.validate = (value) =>
                        value === password || t('auth.register.passwordMismatch')
                }

                return (
                    <AuthInput
                        key={input.key}
                        input={input}
                        register={() => register(input.key, validationRules)}
                        error={errors[input.key]}
                    />
                )
            })}

            <div className="agree-terms">
                <div className="checkbox-wrapper">
                    <input
                        type="checkbox"
                        id="termsCheckbox"
                        {...register("terms", { required: t('auth.register.termsRequired') })}
                    />
                    <label htmlFor="termsCheckbox">
                        {t('auth.register.termsPrefix')} <span>{t('auth.register.termsArena')}</span> {t('auth.register.termsMiddle')} <span>{t('auth.register.termsSecurity')}</span>
                    </label>
                </div>
                {errors.terms && <div className="form_error-msg">{errors.terms.message}</div>}
            </div>
            
            {serverError && <div className="error-msg">{serverError.message}</div>}

            <TurnstileWidget onTokenChange={handleTurnstileTokenChange} resetSignal={turnstileResetSignal} />

            <button type="submit" className="register-btn submit-btn" disabled={isPending || !turnstileToken}>
                {isPending ? t('auth.register.submitting') : t('auth.register.submit')}
            </button>
        </form>
    )
}

export default RegisterForm
