import { loginInputs } from "./AuthForm.data"
import AuthInput from "../../shared/ui/Auth/AuthInput"

const LoginForm = () => {
    return (
        <form id="loginForm">
            {loginInputs.map((input) => {
                return (
                    <AuthInput
                        key={input.key}
                        input={input}
                    />
                )
            })}

            <button type="submit" class="login-btn submit-btn">
                ВОЙТИ
            </button>
            
            <div class="options-row">
                <a href="#" class="forgot-password link" id="forgotPasswordLink">Забыли пароль?</a>
            </div>
        </form>
    )
}

export default LoginForm